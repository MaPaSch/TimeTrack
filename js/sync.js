/**
 * TimeTrack PWA - Sync Engine
 * Synchronisation zwischen IndexedDB und Supabase
 */

const Sync = (function() {
    'use strict';

    // Sync State
    const SYNC_STATE = {
        IDLE: 'idle',
        SYNCING: 'syncing',
        ERROR: 'error'
    };

    let currentState = SYNC_STATE.IDLE;
    let lastSyncTime = null;
    let pendingChanges = 0;
    let syncInterval = null;
    // true zwischen startAutoSync() und stopAutoSync() (Intervall pausiert im Hintergrund)
    let autoSyncActive = false;
    let syncListeners = [];
    let debouncedPushTimer = null;
    // Kette aller Push/Pull-Läufe: es läuft immer nur einer gleichzeitig
    let syncChain = Promise.resolve();
    // false, sobald die Cloud die Spalte client_updated_at nicht kennt (Migration v4 fehlt)
    let hasClientUpdatedAt = true;

    const PUSH_DEBOUNCE_MS = 5000;
    // Überlappung beim Delta-Pull, damit Uhrabweichungen zwischen Geräten keine Änderungen verschlucken
    const DELTA_OVERLAP_MS = 5 * 60 * 1000;
    // Supabase liefert pro Anfrage max. 1000 Zeilen
    const PAGE_SIZE = 1000;
    // IDs pro Abfrage beim Konfliktabgleich (begrenzt die URL-Länge)
    const ID_CHUNK_SIZE = 100;

    // Feld, über das gleichnamige Datensätze beim Zusammenführen erkannt werden
    const NAME_FIELD = {
        companies: 'name',
        categories: 'name',
        textSnippets: 'content'
    };

    // Zeiteintrag-Feld, das auf den Store verweist (für das Umhängen beim Zusammenführen)
    const ENTRY_REFERENCE = {
        companies: 'companyId',
        categories: 'categoryId'
    };

    // Tabellen-Mapping: IndexedDB Store -> Supabase Table
    const TABLE_MAP = {
        companies: 'companies',
        categories: 'categories',
        timeEntries: 'time_entries',
        textSnippets: 'text_snippets'
    };

    // Reihenfolge der Stores beim Push/Pull
    const SYNC_STORES = Object.keys(TABLE_MAP);

    /**
     * Leere Zähler pro Store, z. B. für stats.pushed / stats.pulled
     * @returns {Object}
     */
    function emptyCounts() {
        return SYNC_STORES.reduce((acc, store) => {
            acc[store] = 0;
            return acc;
        }, {});
    }

    /**
     * Prüft ob ein Zähler-Objekt Änderungen enthält
     * @param {Object} counts
     * @returns {boolean}
     */
    function hasCounts(counts) {
        return SYNC_STORES.some(store => counts[store] > 0);
    }

    /**
     * Führt einen Sync-Schritt exklusiv aus (wartet auf laufende Push/Pull-Läufe),
     * damit sich Push, Pull und Voll-Sync nicht gegenseitig in die Quere kommen
     * @param {Function} task - async () => any
     * @returns {Promise<any>}
     */
    function runExclusive(task) {
        const run = syncChain.then(task, task);
        syncChain = run.catch(() => {});
        return run;
    }

    // Lokale Lese-/Schreibfunktionen pro Store (für den Merge beim Pull)
    const LOCAL_ACCESS = {
        companies: { get: id => DB.getCompany(id), add: data => DB.addCompany(data) },
        categories: { get: id => DB.getCategory(id), add: data => DB.addCategory(data) },
        timeEntries: { get: id => DB.getTimeEntry(id), add: data => DB.addTimeEntry(data) },
        textSnippets: { get: id => DB.getTextSnippet(id), add: data => DB.addTextSnippet(data) }
    };

    /**
     * Initialisiert die Sync-Engine
     */
    function init() {
        // Online/Offline Events überwachen
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Data Change Events überwachen (für Event-basiertes Push)
        window.addEventListener('dataChanged', handleDataChanged);

        // Page Visibility: Sync bei Tab-Wechsel auf sichtbar, Intervall im Hintergrund pausieren
        if (typeof document.visibilityState !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        // Auth State überwachen
        Auth.onAuthStateChange((event) => {
            // Supabase meldet SIGNED_IN u. a. auch beim erneuten Fokussieren des Tabs –
            // nur beim Übergang zu "angemeldet" einen Voll-Sync starten
            if (event === 'SIGNED_IN' && !autoSyncActive) {
                startAutoSync();
            } else if (event === 'SIGNED_OUT') {
                stopAutoSync();
            }
        });
    }

    /**
     * Handler für Datenänderungen - triggert debounced Push
     * @param {CustomEvent} event 
     */
    function handleDataChanged(event) {
        if (!Auth.isCloudMode() || !SupabaseClient.isOnline()) {
            return;
        }

        // Debounced Push
        if (debouncedPushTimer) {
            clearTimeout(debouncedPushTimer);
        }
        
        debouncedPushTimer = setTimeout(async () => {
            debouncedPushTimer = null;
            const stats = {
                pushed: emptyCounts(),
                errors: []
            };

            try {
                await pushPendingChanges(stats);
            } catch (error) {
                console.error('Sync: Push error', error);
                stats.errors.push(error.message);
            }
            reportPushResult(stats);
        }, PUSH_DEBOUNCE_MS);
    }

    /**
     * Meldet das Ergebnis eines Pushs außerhalb des Voll-Syncs an die Listener.
     * Fehlgeschlagene Pushes werden beim nächsten Intervall erneut versucht.
     * @param {Object} stats - { pushed, errors }
     */
    function reportPushResult(stats) {
        if (stats.errors.length > 0) {
            setState(SYNC_STATE.ERROR);
            notifyListeners({ type: 'sync_error', error: stats.errors.join('; '), stats });
        } else if (hasCounts(stats.pushed) || currentState === SYNC_STATE.ERROR) {
            setState(SYNC_STATE.IDLE);
            notifyListeners({ type: 'push_complete', stats });
        }
    }

    /**
     * Gibt es lokal noch nicht synchronisierte Änderungen (inkl. Löschungen)?
     * @returns {Promise<boolean>}
     */
    async function hasUnsyncedChanges() {
        if ((await DB.getSyncQueue()).length > 0) return true;
        const localData = await DB.getAllData();
        return SYNC_STORES.some(store => localData[store].some(r => r.syncState !== DB.SYNC_STATE.SYNCED));
    }

    /**
     * Periodischer Sync: Delta-Pull; stehen noch Änderungen aus oder ist der letzte
     * Lauf fehlgeschlagen, stattdessen ein Voll-Sync (= automatischer Neuversuch)
     */
    async function periodicSync() {
        if (!Auth.isCloudMode() || !SupabaseClient.isOnline()) return;
        try {
            if (currentState === SYNC_STATE.ERROR || await hasUnsyncedChanges()) {
                await syncAll();
            } else {
                await pullDeltaChanges();
            }
        } catch (error) {
            console.error('Sync: periodischer Sync fehlgeschlagen', error);
        }
    }

    /**
     * Handler für Online-Event
     */
    function handleOnline() {
        if (Auth.isCloudMode()) {
            syncAll();
        }
    }

    /**
     * Handler für Offline-Event
     */
    function handleOffline() {
        notifyListeners({ type: 'offline' });
    }

    /**
     * Handler für Page Visibility: Tab sichtbar/versteckt
     * Bei visible: einmal Delta-Pull für frischen Stand, Intervall ggf. neu starten.
     * Bei hidden: Intervall stoppen (weniger Last im Hintergrund).
     */
    function handleVisibilityChange() {
        if (typeof document.visibilityState === 'undefined') {
            return;
        }
        if (document.visibilityState === 'visible') {
            if (Auth.isCloudMode() && SupabaseClient.isOnline()) {
                periodicSync();
                // Intervall war bei hidden gestoppt – wieder starten
                if (!syncInterval && Auth.isCloudMode()) {
                    syncInterval = setInterval(periodicSync, Config.SYNC_INTERVAL_MS);
                }
            }
        } else {
            // Tab im Hintergrund: Intervall stoppen
            if (syncInterval) {
                clearInterval(syncInterval);
                syncInterval = null;
            }
        }
    }

    /**
     * Startet automatische Synchronisation
     */
    function startAutoSync() {
        autoSyncActive = true;
        if (syncInterval) {
            clearInterval(syncInterval);
        }

        // Initiale vollständige Sync
        syncAll();

        // Periodischer Delta-Pull; ausstehende/fehlgeschlagene Pushes werden dabei nachgeholt
        syncInterval = setInterval(periodicSync, Config.SYNC_INTERVAL_MS);
    }

    /**
     * Stoppt automatische Synchronisation
     */
    function stopAutoSync() {
        autoSyncActive = false;
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    /**
     * Registriert einen Sync-Listener
     * @param {Function} callback - ({ type, data }) => void
     * @returns {Function} Unsubscribe-Funktion
     */
    function onSyncChange(callback) {
        syncListeners.push(callback);
        
        // Sofort mit aktuellem State aufrufen
        callback({ 
            type: 'state', 
            state: currentState, 
            lastSync: lastSyncTime,
            pending: pendingChanges 
        });
        
        return () => {
            syncListeners = syncListeners.filter(l => l !== callback);
        };
    }

    /**
     * Benachrichtigt alle Listener
     * @param {Object} event 
     */
    function notifyListeners(event) {
        syncListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Sync Listener Error:', error);
            }
        });
    }

    /**
     * Setzt den Sync-State
     * @param {string} state 
     */
    function setState(state) {
        currentState = state;
        notifyListeners({ 
            type: 'state', 
            state: currentState, 
            lastSync: lastSyncTime,
            pending: pendingChanges 
        });
    }

    /**
     * Führt eine vollständige Synchronisation durch
     * @returns {Promise<Object>} { success, stats }
     */
    async function syncAll() {
        if (currentState === SYNC_STATE.SYNCING) {
            return { success: false, reason: 'already_syncing' };
        }

        if (!Auth.isCloudMode()) {
            return { success: false, reason: 'not_cloud_mode' };
        }

        if (!SupabaseClient.isOnline()) {
            return { success: false, reason: 'offline' };
        }

        setState(SYNC_STATE.SYNCING);
        notifyListeners({ type: 'sync_start' });

        return runExclusive(async () => {
            const stats = {
                pushed: emptyCounts(),
                pulled: emptyCounts(),
                errors: []
            };

            const syncStartedAt = Date.now();

            try {
                // Supabase-Session kann kurz nach SIGNED_IN noch nicht verfügbar sein (Race).
                // Auf User warten (Polling bis max. 2s), damit Push/Pull nicht mit "Nicht angemeldet" scheitern.
                const waitForUserMs = 2000;
                const pollIntervalMs = 80;
                let user = await SupabaseClient.getUser();
                for (let waited = 0; !user && waited < waitForUserMs; waited += pollIntervalMs) {
                    await new Promise(r => setTimeout(r, pollIntervalMs));
                    user = await SupabaseClient.getUser();
                }

                // Push lokale Änderungen zur Cloud (nur ungesyncte, mit Konfliktabgleich)
                await pushPendingChangesInternal(stats);

                // Pull Cloud-Änderungen lokal
                await pullChanges(stats);
            } catch (error) {
                console.error('Sync Fehler:', error);
                stats.errors.push(error.message);
            }

            // Teilweise fehlgeschlagene Pushes nicht als Erfolg melden – die betroffenen
            // Datensätze bleiben PENDING und werden beim nächsten Lauf erneut versucht
            if (stats.errors.length > 0) {
                const message = stats.errors.join('; ');
                setState(SYNC_STATE.ERROR);
                notifyListeners({
                    type: 'sync_error',
                    error: message,
                    stats
                });
                return { success: false, error: message, stats };
            }

            localStorage.setItem('lastSyncTimestamp', syncStartedAt.toString());
            lastSyncTime = new Date();
            pendingChanges = 0;
            setState(SYNC_STATE.IDLE);

            notifyListeners({
                type: 'sync_complete',
                stats,
                lastSync: lastSyncTime
            });

            return { success: true, stats };
        });
    }

    /**
     * Verarbeitet ausstehende Löschungen aus der Sync-Queue (Soft-Delete in der Cloud)
     * @param {Object} stats
     */
    async function pushPendingDeletes(stats) {
        const queue = await DB.getSyncQueue();
        const deletes = queue.filter(item => item.operation === 'delete');
        for (const item of deletes) {
            const table = TABLE_MAP[item.entityType];
            if (!table) continue;
            const { error } = await SupabaseClient.softDeleteUserData(table, item.entityId);
            if (!error) {
                await DB.removeFromSyncQueue(item.id);
            } else {
                stats.errors.push(`Delete ${item.entityType}/${item.entityId}: ${error.message}`);
            }
        }
    }

    /**
     * Lädt die aktuellen Cloud-Stände zu den übergebenen IDs
     * @param {string} table
     * @param {Array<string>} ids
     * @returns {Promise<Map<string, Object>>} id -> Cloud-Datensatz
     */
    async function fetchCloudVersions(table, ids) {
        const client = SupabaseClient.getClient();
        const versions = new Map();
        for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
            const chunk = ids.slice(i, i + ID_CHUNK_SIZE);
            const { data, error } = await client.from(table).select('*').in('id', chunk);
            if (error) {
                throw new Error(`${table}: ${error.message}`);
            }
            data.forEach(row => versions.set(row.id, row));
        }
        return versions;
    }

    /**
     * Zeitpunkt der letzten Bearbeitung eines Cloud-Datensatzes (ms).
     * client_updated_at ist die Bearbeitungszeit auf dem Gerät; ohne Migration v4
     * (oder von Clients, die sie nicht setzen) dient updated_at (Push-Zeit) als Näherung.
     * @param {Object} cloudRecord
     * @returns {number}
     */
    function cloudEditTime(cloudRecord) {
        return new Date(cloudRecord.client_updated_at || cloudRecord.updated_at).getTime();
    }

    /**
     * Konfliktabgleich vor dem Push (Last-Write-Wins nach Bearbeitungszeit):
     * - In der Cloud gelöscht → Löschung gewinnt, lokal entfernen
     * - Cloud seit dem letzten Sync unverändert → lokale Änderung pushen
     * - Beide geändert → die später bearbeitete Version gewinnt; gewinnt die Cloud,
     *   wird sie lokal übernommen statt gepusht
     * @param {string} storeName
     * @param {Array} records - lokale, nicht synchronisierte Datensätze
     * @param {Object} stats
     * @returns {Promise<Array>} Datensätze, die gepusht werden sollen
     */
    async function resolveConflicts(storeName, records, stats) {
        const cloudVersions = await fetchCloudVersions(TABLE_MAP[storeName], records.map(r => r.id));
        const toPush = [];

        for (const record of records) {
            const cloud = cloudVersions.get(record.id);
            if (!cloud) {
                toPush.push(record);
                continue;
            }

            if (cloud.deleted_at) {
                await DB.removeFromSync(storeName, record.id);
                countPulled(stats, storeName);
                continue;
            }

            const cloudChanged = new Date(cloud.updated_at).getTime() !== record.syncedAt;
            if (!cloudChanged || record.updatedAt >= cloudEditTime(cloud)) {
                toPush.push(record);
                continue;
            }

            // Cloud-Version ist neuer: übernehmen statt pushen
            const merged = {
                ...record,
                ...mapToLocalFormat(storeName, cloud),
                updatedAt: cloudEditTime(cloud),
                syncState: DB.SYNC_STATE.SYNCED,
                syncedAt: new Date(cloud.updated_at).getTime()
            };
            if (merged.colorIndex === null && record.colorIndex !== undefined) {
                merged.colorIndex = record.colorIndex;
            }
            await DB.putFromSync(storeName, merged);
            countPulled(stats, storeName);
        }

        return toPush;
    }

    /**
     * Zählt eine lokale Änderung durch Cloud-Daten (stats.pulled ist beim reinen Push optional)
     */
    function countPulled(stats, storeName) {
        if (stats.pulled) stats.pulled[storeName]++;
    }

    /**
     * Ordnet neue lokale Unternehmen/Kategorien/Textbausteine gleichnamigen Cloud-
     * Datensätzen zu (z. B. nach dem ersten Login oder wenn zwei Geräte offline denselben
     * Namen angelegt haben). Zeiteinträge werden auf die Cloud-ID umgehängt, das lokale
     * Duplikat wird entfernt.
     * @param {string} storeName
     * @param {Array} records - lokale, nicht synchronisierte Datensätze
     * @param {string} userId
     * @param {Object} stats
     * @returns {Promise<Array>} verbleibende Datensätze (ohne zugeordnete Duplikate)
     */
    async function mergeByName(storeName, records, userId, stats) {
        const field = NAME_FIELD[storeName];
        // Nur nie synchronisierte Datensätze kommen als Duplikat in Frage
        const candidates = records.filter(r => !r.syncedAt);
        if (!field || candidates.length === 0) return records;

        const { data: cloudRecords, error } = await fetchWithDelta(TABLE_MAP[storeName], userId, null);
        if (error) {
            throw new Error(error.message);
        }

        const normalize = value => (value || '').trim().toLocaleLowerCase('de');
        const cloudIds = new Set(cloudRecords.map(r => r.id));
        const cloudByName = new Map();
        cloudRecords
            .filter(r => !r.deleted_at)
            .forEach(r => {
                const key = normalize(r[field]);
                if (!cloudByName.has(key)) cloudByName.set(key, r);
            });

        const reference = ENTRY_REFERENCE[storeName];
        const merged = new Set();
        for (const record of candidates) {
            if (cloudIds.has(record.id)) continue;
            const match = cloudByName.get(normalize(record[field]));
            if (!match) continue;

            // Cloud-Datensatz lokal bereitstellen (lokale Farbe behalten, falls die Cloud keine hat)
            if (!(await LOCAL_ACCESS[storeName].get(match.id))) {
                const local = mapToLocalFormat(storeName, match);
                if (local.colorIndex === null && record.colorIndex !== undefined) {
                    local.colorIndex = record.colorIndex;
                }
                await DB.putFromSync(storeName, {
                    ...local,
                    syncState: DB.SYNC_STATE.SYNCED,
                    syncedAt: new Date(match.updated_at).getTime()
                });
            }

            // Zeiteinträge umhängen (werden dadurch PENDING und im selben Lauf gepusht)
            if (reference) {
                const entries = (await DB.getAllData()).timeEntries.filter(e => e[reference] === record.id);
                for (const entry of entries) {
                    await DB.updateTimeEntry({ ...entry, [reference]: match.id });
                }
            }

            await DB.removeFromSync(storeName, record.id);
            merged.add(record.id);
            countPulled(stats, storeName);
        }

        return records.filter(r => !merged.has(r.id));
    }

    /**
     * Pushed die Datensätze eines Stores als Batch (ein Request pro Tabelle)
     * und markiert sie bei Erfolg als synchronisiert.
     * @param {string} storeName
     * @param {Array} records - Lokale Datensätze
     * @param {string} userId
     * @param {Object} stats
     */
    async function pushBatch(storeName, records, userId, stats) {
        if (records.length === 0) return;

        const table = TABLE_MAP[storeName];
        let cloudRecords = records.map(r => mapToCloudFormat(storeName, r, userId));
        if (!hasClientUpdatedAt) {
            cloudRecords = cloudRecords.map(({ client_updated_at, ...rest }) => rest);
        }
        let { data, error } = await SupabaseClient.upsertUserData(table, cloudRecords);

        // Fallback: Cloud-Schema noch ohne client_updated_at (Migration v4 nicht ausgeführt)
        if (error && JSON.stringify(error).includes('client_updated_at')) {
            console.warn('Sync: Spalte client_updated_at fehlt – bitte supabase-migration-v4.pgsql ausführen');
            hasClientUpdatedAt = false;
            cloudRecords = cloudRecords.map(({ client_updated_at, ...rest }) => rest);
            ({ data, error } = await SupabaseClient.upsertUserData(table, cloudRecords));
        }

        // Fallback: Cloud-Schema noch ohne color_index (Migration v3 nicht ausgeführt)
        if (error && storeName === 'categories' && JSON.stringify(error).includes('color_index')) {
            console.warn('Sync: Spalte categories.color_index fehlt – bitte supabase-migration-v3.pgsql ausführen');
            cloudRecords = cloudRecords.map(({ color_index, ...rest }) => rest);
            ({ data, error } = await SupabaseClient.upsertUserData(table, cloudRecords));
        }

        if (error) {
            stats.errors.push(`${storeName} batch: ${error.message}`);
            return;
        }

        const cloudUpdatedAt = new Map((data || []).map(r => [r.id, new Date(r.updated_at).getTime()]));
        for (const record of records) {
            if (await DB.markSynced(storeName, record.id, record.updatedAt, cloudUpdatedAt.get(record.id))) {
                stats.pushed[storeName]++;
            }
        }
    }

    /**
     * Pushed alle nicht synchronisierten Datensätze zur Cloud (Selective Push).
     * Läuft exklusiv, also nie parallel zu einem anderen Push oder Pull.
     * @param {Object} stats
     * @returns {Promise<void>}
     */
    function pushPendingChanges(stats) {
        return runExclusive(() => pushPendingChangesInternal(stats));
    }

    /**
     * Push ohne Sperre (nur innerhalb von runExclusive aufrufen).
     * Erfasst neben PENDING auch Fehler-States und Altdaten ohne syncState.
     * @param {Object} stats
     */
    async function pushPendingChangesInternal(stats) {
        const userId = Auth.getUserId();

        if (!userId) {
            throw new Error('Kein User für Push');
        }

        // Zuerst ausstehende Löschungen in der Cloud ausführen
        await pushPendingDeletes(stats);

        // Reihenfolge der Stores: Unternehmen/Kategorien vor Zeiteinträgen, damit
        // umgehängte Einträge (mergeByName) im selben Lauf mitgepusht werden
        for (const storeName of SYNC_STORES) {
            const localRecords = (await DB.getAllData())[storeName];
            let unsynced = localRecords.filter(r => r.syncState !== DB.SYNC_STATE.SYNCED);
            if (unsynced.length === 0) continue;

            try {
                unsynced = await mergeByName(storeName, unsynced, userId, stats);
                unsynced = await resolveConflicts(storeName, unsynced, stats);
            } catch (error) {
                stats.errors.push(`${storeName}: ${error.message}`);
                continue;
            }
            await pushBatch(storeName, unsynced, userId, stats);
        }
    }

    /**
     * Pullt nur geänderte Cloud-Daten seit letztem Sync (Delta Pull)
     * Läuft exklusiv, also nie parallel zu einem anderen Push oder Pull.
     * @param {Object} stats - Optional stats object
     * @returns {Promise<Object>} { success, stats }
     */
    function pullDeltaChanges(stats = null) {
        return runExclusive(() => pullDeltaChangesInternal(stats));
    }

    async function pullDeltaChangesInternal(stats) {
        const internalStats = stats || {
            pulled: emptyCounts(),
            errors: []
        };

        try {
            const user = await SupabaseClient.getUser();
            if (!user) {
                return { success: false, reason: 'no_user' };
            }

            // Startzeit merken: Änderungen während des Pulls werden beim nächsten Mal erfasst
            const pullStartedAt = Date.now();

            // Last Sync Timestamp aus localStorage
            const lastSyncStr = localStorage.getItem('lastSyncTimestamp');
            const lastSyncISO = lastSyncStr
                ? new Date(parseInt(lastSyncStr) - DELTA_OVERLAP_MS).toISOString()
                : null;

            const pendingDeletes = await getPendingDeletes();

            // Alle Tabellen pullen (mit Delta-Filter wenn vorhanden, inkl. Soft-Deletes)
            for (const storeName of SYNC_STORES) {
                const { data, error } = await fetchWithDelta(TABLE_MAP[storeName], user.id, lastSyncISO);
                if (error) {
                    throw new Error(`${storeName}: ${error.message}`);
                }
                for (const cloudRecord of data) {
                    if (await mergeCloudRecord(storeName, cloudRecord, pendingDeletes)) {
                        internalStats.pulled[storeName]++;
                    }
                }
            }

            // Timestamp erst nach erfolgreichem Pull aktualisieren
            localStorage.setItem('lastSyncTimestamp', pullStartedAt.toString());
            lastSyncTime = new Date();

            if (hasCounts(internalStats.pulled)) {
                notifyListeners({ type: 'pull_complete', stats: internalStats });
            }

            return { success: true, stats: internalStats };
        } catch (error) {
            console.error('Sync: Delta pull error', error);
            internalStats.errors.push(error.message);
            return { success: false, error: error.message, stats: internalStats };
        }
    }

    /**
     * Pending-Deletes aus der Sync-Queue: lokal gelöschte IDs nicht wieder einfügen
     * @returns {Promise<Set<string>>} Einträge der Form 'storeName:id'
     */
    async function getPendingDeletes() {
        const queue = await DB.getSyncQueue();
        return new Set(
            queue.filter(i => i.operation === 'delete').map(i => i.entityType + ':' + i.entityId)
        );
    }

    /**
     * Fetcht Daten seitenweise mit optionalem Delta-Filter (inkl. Soft-Deletes)
     * @param {string} table
     * @param {string} userId
     * @param {string|null} sinceISO
     * @returns {Promise<Object>} { data, error }
     */
    async function fetchWithDelta(table, userId, sinceISO) {
        const client = SupabaseClient.getClient();
        if (!client) {
            return { data: null, error: new Error('No client') };
        }

        const rows = [];
        for (let from = 0; ; from += PAGE_SIZE) {
            let query = client
                .from(table)
                .select('*')
                .eq('user_id', userId);

            if (sinceISO) {
                query = query.gt('updated_at', sinceISO);
            }

            const { data, error } = await query.order('id').range(from, from + PAGE_SIZE - 1);
            if (error) {
                return { data: null, error };
            }
            rows.push(...data);
            if (data.length < PAGE_SIZE) {
                return { data: rows, error: null };
            }
        }
    }

    /**
     * Pullt alle Cloud-Daten lokal (Teil von syncAll) und entfernt lokal synchronisierte
     * Datensätze, die in der Cloud nicht mehr existieren (z. B. nach Hard-Delete)
     * @param {Object} stats
     */
    async function pullChanges(stats) {
        const user = await SupabaseClient.getUser();
        if (!user) {
            throw new Error('Kein User für Pull');
        }

        const pendingDeletes = await getPendingDeletes();
        const localData = await DB.getAllData();

        for (const storeName of SYNC_STORES) {
            const { data: cloudRecords, error } = await fetchWithDelta(TABLE_MAP[storeName], user.id, null);
            if (error) {
                throw new Error(`${storeName}: ${error.message}`);
            }

            for (const cloudRecord of cloudRecords) {
                if (await mergeCloudRecord(storeName, cloudRecord, pendingDeletes)) {
                    stats.pulled[storeName]++;
                }
            }

            const cloudIds = new Set(cloudRecords.map(r => r.id));
            for (const record of localData[storeName]) {
                if (record.syncState === DB.SYNC_STATE.SYNCED && !cloudIds.has(record.id)) {
                    await DB.removeFromSync(storeName, record.id);
                    stats.pulled[storeName]++;
                }
            }
        }
    }

    /**
     * Mappt lokale Daten ins Cloud-Format
     * @param {string} type 
     * @param {Object} localData 
     * @param {string} userId 
     * @returns {Object}
     */
    function mapToCloudFormat(type, localData, userId) {
        const base = {
            id: localData.id,
            user_id: userId,
            created_at: new Date(localData.createdAt).toISOString(),
            updated_at: new Date().toISOString(),
            // Bearbeitungszeit auf dem Gerät – Grundlage der Konfliktauflösung (Migration v4)
            client_updated_at: new Date(localData.updatedAt || localData.createdAt).toISOString()
        };

        switch (type) {
            case 'companies':
                return {
                    ...base,
                    name: localData.name
                };
            case 'categories':
                return {
                    ...base,
                    name: localData.name,
                    color_index: localData.colorIndex ?? null
                };
            case 'textSnippets':
                return {
                    ...base,
                    content: localData.content
                };
            case 'timeEntries':
                return {
                    ...base,
                    company_id: localData.companyId,
                    category_id: localData.categoryId || null,
                    date: new Date(localData.date).toISOString(),
                    start_time: new Date(localData.startTime).toISOString(),
                    end_time: new Date(localData.endTime).toISOString(),
                    duration: localData.duration,
                    note: localData.note || null
                };
            default:
                return base;
        }
    }

    /**
     * Mappt Cloud-Daten ins lokale Format
     * @param {string} type 
     * @param {Object} cloudData 
     * @returns {Object}
     */
    function mapToLocalFormat(type, cloudData) {
        const base = {
            id: cloudData.id,
            createdAt: new Date(cloudData.created_at).getTime(),
            updatedAt: cloudEditTime(cloudData)
        };

        switch (type) {
            case 'companies':
                return {
                    ...base,
                    name: cloudData.name
                };
            case 'categories':
                return {
                    ...base,
                    name: cloudData.name,
                    // null → DB.addCategory vergibt die nächste Palettenfarbe
                    colorIndex: cloudData.color_index ?? null
                };
            case 'textSnippets':
                return {
                    ...base,
                    content: cloudData.content
                };
            case 'timeEntries':
                return {
                    ...base,
                    companyId: cloudData.company_id,
                    categoryId: cloudData.category_id,
                    date: new Date(cloudData.date).getTime(),
                    startTime: new Date(cloudData.start_time).getTime(),
                    endTime: new Date(cloudData.end_time).getTime(),
                    duration: cloudData.duration,
                    note: cloudData.note
                };
            default:
                return base;
        }
    }

    /**
     * Merged einen Cloud-Datensatz in die lokale DB.
     * - In der Cloud gelöscht → lokal löschen
     * - Lokal noch nicht gepushte Änderung → lokale Version gewinnt (wird gepusht)
     * - Sonst → Cloud-Version übernehmen, falls sie sich seit dem letzten Sync geändert hat
     * @param {string} type - Store-Name
     * @param {Object} cloudRecord - Datensatz im Cloud-Format
     * @param {Set<string>} pendingDeletes
     * @returns {Promise<boolean>} true, wenn lokal etwas geändert wurde
     */
    async function mergeCloudRecord(type, cloudRecord, pendingDeletes) {
        // Lokal gelöscht, aber noch nicht in Cloud gesynct: nicht wieder einfügen
        if (pendingDeletes.has(type + ':' + cloudRecord.id)) {
            return false;
        }

        const access = LOCAL_ACCESS[type];
        if (!access) return false;

        let existingData = null;
        try {
            existingData = await access.get(cloudRecord.id);
        } catch (e) {
            existingData = null;
        }

        if (cloudRecord.deleted_at) {
            if (!existingData) return false;
            await DB.removeFromSync(type, cloudRecord.id);
            return true;
        }

        const data = {
            ...mapToLocalFormat(type, cloudRecord),
            syncState: DB.SYNC_STATE.SYNCED,
            syncedAt: new Date(cloudRecord.updated_at).getTime()
        };

        // Neu: hinzufügen (als synchronisiert, kein erneuter Push)
        if (!existingData) {
            await access.add(data);
            return true;
        }

        if (existingData.syncState !== DB.SYNC_STATE.SYNCED || existingData.syncedAt === data.syncedAt) {
            return false;
        }

        const merged = { ...existingData, ...data };
        // Cloud ohne color_index: lokale Farbe behalten
        if (merged.colorIndex === null && existingData.colorIndex !== undefined) {
            merged.colorIndex = existingData.colorIndex;
        }
        await DB.putFromSync(type, merged);
        return true;
    }

    /**
     * Formatiert die letzte Sync-Zeit für die Anzeige
     * @returns {string}
     */
    function getLastSyncFormatted() {
        if (!lastSyncTime) {
            return 'Noch nie synchronisiert';
        }

        const now = new Date();
        const diff = now - lastSyncTime;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);

        if (minutes < 1) {
            return 'Gerade eben';
        } else if (minutes < 60) {
            return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
        } else if (hours < 24) {
            return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
        } else {
            return lastSyncTime.toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    return {
        init,
        syncAll,
        pullDeltaChanges,
        pushPendingChanges,
        onSyncChange,
        getLastSyncFormatted,
        startAutoSync,
        stopAutoSync,
        SYNC_STATE
    };
})();
