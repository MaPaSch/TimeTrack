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
    let syncListeners = [];
    let debouncedPushTimer = null;

    const PUSH_DEBOUNCE_MS = 5000;

    // Tabellen-Mapping: IndexedDB Store -> Supabase Table
    const TABLE_MAP = {
        companies: 'companies',
        categories: 'categories',
        timeEntries: 'time_entries'
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
            if (event === 'SIGNED_IN') {
                startAutoSync();
            } else if (event === 'SIGNED_OUT') {
                stopAutoSync();
            }
        });

        console.log('Sync Engine initialisiert (Delta-Sync)');
    }

    /**
     * Handler für Datenänderungen - triggert debounced Push
     * @param {CustomEvent} event 
     */
    function handleDataChanged(event) {
        console.log('Sync: Data changed', event.detail);
        
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
                pushed: { companies: 0, categories: 0, timeEntries: 0 },
                errors: []
            };
            
            try {
                await pushPendingChanges(stats);
                if (stats.pushed.companies > 0 || stats.pushed.categories > 0 || stats.pushed.timeEntries > 0) {
                    console.log('Sync: Pushed pending changes', stats.pushed);
                    notifyListeners({ type: 'push_complete', stats });
                }
            } catch (error) {
                console.error('Sync: Push error', error);
            }
        }, PUSH_DEBOUNCE_MS);
    }

    /**
     * Handler für Online-Event
     */
    function handleOnline() {
        console.log('Sync: Online');
        if (Auth.isCloudMode()) {
            syncAll();
        }
    }

    /**
     * Handler für Offline-Event
     */
    function handleOffline() {
        console.log('Sync: Offline');
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
                pullDeltaChanges();
                // Intervall war bei hidden gestoppt – wieder starten
                if (!syncInterval && Auth.isCloudMode()) {
                    syncInterval = setInterval(() => {
                        if (Auth.isCloudMode() && SupabaseClient.isOnline()) {
                            pullDeltaChanges();
                        }
                    }, Config.SYNC_INTERVAL_MS);
                    console.log('Sync: Intervall nach Tab-Fokus neu gestartet');
                }
            }
        } else {
            // Tab im Hintergrund: Intervall stoppen
            if (syncInterval) {
                clearInterval(syncInterval);
                syncInterval = null;
                console.log('Sync: Intervall pausiert (Tab im Hintergrund)');
            }
        }
    }

    /**
     * Startet automatische Synchronisation
     */
    function startAutoSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
        }

        // Initiale vollständige Sync
        syncAll();

        // Periodische Delta-Pull (kein Push - das passiert event-basiert)
        syncInterval = setInterval(() => {
            if (Auth.isCloudMode() && SupabaseClient.isOnline()) {
                pullDeltaChanges();
            }
        }, Config.SYNC_INTERVAL_MS);

        console.log('Auto-Sync gestartet (Interval: ' + (Config.SYNC_INTERVAL_MS / 1000) + 's)');
    }

    /**
     * Stoppt automatische Synchronisation
     */
    function stopAutoSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
        console.log('Auto-Sync gestoppt');
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
            console.log('Sync: Bereits in Bearbeitung');
            return { success: false, reason: 'already_syncing' };
        }

        if (!Auth.isCloudMode()) {
            console.log('Sync: Nicht im Cloud-Modus');
            return { success: false, reason: 'not_cloud_mode' };
        }

        if (!SupabaseClient.isOnline()) {
            console.log('Sync: Offline');
            return { success: false, reason: 'offline' };
        }

        setState(SYNC_STATE.SYNCING);
        notifyListeners({ type: 'sync_start' });

        const stats = {
            pushed: { companies: 0, categories: 0, timeEntries: 0 },
            pulled: { companies: 0, categories: 0, timeEntries: 0 },
            errors: []
        };

        try {
            // Push lokale Änderungen zur Cloud
            await pushChanges(stats);

            // Supabase-Session kann kurz nach SIGNED_IN noch nicht verfügbar sein (Race).
            // Auf User warten (Polling bis max. 2s), damit pullChanges nicht mit "Nicht angemeldet" 0 Daten lädt.
            const waitForUserMs = 2000;
            const pollIntervalMs = 80;
            let user = await SupabaseClient.getUser();
            for (let waited = 0; !user && waited < waitForUserMs; waited += pollIntervalMs) {
                await new Promise(r => setTimeout(r, pollIntervalMs));
                user = await SupabaseClient.getUser();
            }

            // Pull Cloud-Änderungen lokal
            await pullChanges(stats);

            lastSyncTime = new Date();
            pendingChanges = 0;
            setState(SYNC_STATE.IDLE);
            
            notifyListeners({ 
                type: 'sync_complete', 
                stats,
                lastSync: lastSyncTime 
            });

            console.log('Sync abgeschlossen:', stats);
            return { success: true, stats };
        } catch (error) {
            console.error('Sync Fehler:', error);
            stats.errors.push(error.message);
            setState(SYNC_STATE.ERROR);
            
            notifyListeners({ 
                type: 'sync_error', 
                error: error.message,
                stats 
            });

            return { success: false, error: error.message, stats };
        }
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
     * Pushed nur PENDING Einträge zur Cloud (Selective Push)
     * @param {Object} stats 
     */
    async function pushPendingChanges(stats) {
        const userId = Auth.getUserId();

        if (!userId) {
            throw new Error('Kein User für Push');
        }

        // Zuerst ausstehende Löschungen in der Cloud ausführen
        await pushPendingDeletes(stats);

        // Nur PENDING Einträge holen
        const pendingCompanies = await DB.getBySyncState('companies', DB.SYNC_STATE.PENDING);
        const pendingCategories = await DB.getBySyncState('categories', DB.SYNC_STATE.PENDING);
        const pendingEntries = await DB.getBySyncState('timeEntries', DB.SYNC_STATE.PENDING);

        // Companies als Batch pushen (ein Request pro Tabelle)
        if (pendingCompanies.length > 0) {
            const companiesArray = pendingCompanies.map(c => mapToCloudFormat('companies', c, userId));
            const { error } = await SupabaseClient.upsertUserData('companies', companiesArray);
            if (!error) {
                for (const company of pendingCompanies) {
                    await DB.updateSyncState('companies', company.id, DB.SYNC_STATE.SYNCED);
                    stats.pushed.companies++;
                }
            } else {
                stats.errors.push(`Companies batch: ${error.message}`);
            }
        }

        // Categories als Batch pushen
        if (pendingCategories.length > 0) {
            const categoriesArray = pendingCategories.map(c => mapToCloudFormat('categories', c, userId));
            const { error } = await SupabaseClient.upsertUserData('categories', categoriesArray);
            if (!error) {
                for (const category of pendingCategories) {
                    await DB.updateSyncState('categories', category.id, DB.SYNC_STATE.SYNCED);
                    stats.pushed.categories++;
                }
            } else {
                stats.errors.push(`Categories batch: ${error.message}`);
            }
        }

        // Time Entries als Batch pushen
        if (pendingEntries.length > 0) {
            const entriesArray = pendingEntries.map(e => mapToCloudFormat('timeEntries', e, userId));
            const { error } = await SupabaseClient.upsertUserData('time_entries', entriesArray);
            if (!error) {
                for (const entry of pendingEntries) {
                    await DB.updateSyncState('timeEntries', entry.id, DB.SYNC_STATE.SYNCED);
                    stats.pushed.timeEntries++;
                }
            } else {
                stats.errors.push(`Time entries batch: ${error.message}`);
            }
        }
    }

    /**
     * Legacy-Funktion: Pushed alle lokale Daten zur Cloud
     * @param {Object} stats 
     */
    async function pushChanges(stats) {
        const localData = await DB.getAllData();
        const userId = Auth.getUserId();

        if (!userId) {
            throw new Error('Kein User für Push');
        }

        // Zuerst ausstehende Löschungen in der Cloud ausführen
        await pushPendingDeletes(stats);

        // Companies als Batch pushen (ein Request pro Tabelle)
        if (localData.companies.length > 0) {
            const companiesArray = localData.companies.map(c => mapToCloudFormat('companies', c, userId));
            const { error } = await SupabaseClient.upsertUserData('companies', companiesArray);
            if (!error) {
                for (const company of localData.companies) {
                    await DB.updateSyncState('companies', company.id, DB.SYNC_STATE.SYNCED);
                    stats.pushed.companies++;
                }
            } else {
                stats.errors.push(`Companies batch: ${error.message}`);
            }
        }

        // Categories als Batch pushen
        if (localData.categories.length > 0) {
            const categoriesArray = localData.categories.map(c => mapToCloudFormat('categories', c, userId));
            const { error } = await SupabaseClient.upsertUserData('categories', categoriesArray);
            if (!error) {
                for (const category of localData.categories) {
                    await DB.updateSyncState('categories', category.id, DB.SYNC_STATE.SYNCED);
                    stats.pushed.categories++;
                }
            } else {
                stats.errors.push(`Categories batch: ${error.message}`);
            }
        }

        // Time Entries als Batch pushen
        if (localData.timeEntries.length > 0) {
            const entriesArray = localData.timeEntries.map(e => mapToCloudFormat('timeEntries', e, userId));
            const { error } = await SupabaseClient.upsertUserData('time_entries', entriesArray);
            if (!error) {
                for (const entry of localData.timeEntries) {
                    await DB.updateSyncState('timeEntries', entry.id, DB.SYNC_STATE.SYNCED);
                    stats.pushed.timeEntries++;
                }
            } else {
                stats.errors.push(`Time entries batch: ${error.message}`);
            }
        }
    }

    /**
     * Pullt nur geänderte Cloud-Daten seit letztem Sync (Delta Pull)
     * @param {Object} stats - Optional stats object
     * @returns {Promise<Object>} { success, stats }
     */
    async function pullDeltaChanges(stats = null) {
        const internalStats = stats || {
            pulled: { companies: 0, categories: 0, timeEntries: 0 },
            errors: []
        };

        try {
            const user = await SupabaseClient.getUser();
            if (!user) {
                return { success: false, reason: 'no_user' };
            }

            // Last Sync Timestamp aus localStorage
            const lastSyncStr = localStorage.getItem('lastSyncTimestamp');
            const lastSyncISO = lastSyncStr ? new Date(parseInt(lastSyncStr)).toISOString() : null;

            // Pending-Deletes aus Sync-Queue: lokal gelöschte IDs nicht wieder einfügen
            const queue = await DB.getSyncQueue();
            const pendingDeletes = new Set(
                queue.filter(i => i.operation === 'delete').map(i => i.entityType + ':' + i.entityId)
            );

            // Companies pullen (mit Delta-Filter wenn vorhanden)
            const companiesResult = await fetchWithDelta('companies', user.id, lastSyncISO);
            if (companiesResult.data) {
                for (const cloudCompany of companiesResult.data) {
                    const localData = mapToLocalFormat('companies', cloudCompany);
                    await mergeLocalData('companies', localData, pendingDeletes);
                    internalStats.pulled.companies++;
                }
            }

            // Categories pullen
            const categoriesResult = await fetchWithDelta('categories', user.id, lastSyncISO);
            if (categoriesResult.data) {
                for (const cloudCategory of categoriesResult.data) {
                    const localData = mapToLocalFormat('categories', cloudCategory);
                    await mergeLocalData('categories', localData, pendingDeletes);
                    internalStats.pulled.categories++;
                }
            }

            // Time Entries pullen
            const entriesResult = await fetchWithDelta('time_entries', user.id, lastSyncISO);
            if (entriesResult.data) {
                for (const cloudEntry of entriesResult.data) {
                    const localData = mapToLocalFormat('timeEntries', cloudEntry);
                    await mergeLocalData('timeEntries', localData, pendingDeletes);
                    internalStats.pulled.timeEntries++;
                }
            }

            // Timestamp aktualisieren
            localStorage.setItem('lastSyncTimestamp', Date.now().toString());
            lastSyncTime = new Date();

            if (internalStats.pulled.companies > 0 || internalStats.pulled.categories > 0 || internalStats.pulled.timeEntries > 0) {
                console.log('Sync: Delta pulled', internalStats.pulled);
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
     * Fetcht Daten mit optionalem Delta-Filter
     * @param {string} table 
     * @param {string} userId 
     * @param {string|null} lastSyncISO 
     * @returns {Promise<Object>}
     */
    async function fetchWithDelta(table, userId, lastSyncISO) {
        const client = SupabaseClient.getClient();
        if (!client) {
            return { data: null, error: new Error('No client') };
        }

        let query = client
            .from(table)
            .select('*')
            .eq('user_id', userId)
            .is('deleted_at', null);

        if (lastSyncISO) {
            query = query.gt('updated_at', lastSyncISO);
        }

        return await query;
    }

    /**
     * Legacy-Funktion: Pullt alle Cloud-Daten lokal
     * @param {Object} stats 
     */
    async function pullChanges(stats) {
        // Pending-Deletes aus Sync-Queue: lokal gelöschte IDs nicht wieder einfügen
        const queue = await DB.getSyncQueue();
        const pendingDeletes = new Set(
            queue.filter(i => i.operation === 'delete').map(i => i.entityType + ':' + i.entityId)
        );

        // Companies pullen
        const companiesResult = await SupabaseClient.fetchUserData('companies');
        const { data: cloudCompanies } = companiesResult;
        if (cloudCompanies) {
            for (const cloudCompany of cloudCompanies) {
                const localData = mapToLocalFormat('companies', cloudCompany);
                await mergeLocalData('companies', localData, pendingDeletes);
                stats.pulled.companies++;
            }
        }

        // Categories pullen
        const categoriesResult = await SupabaseClient.fetchUserData('categories');
        const { data: cloudCategories } = categoriesResult;
        if (cloudCategories) {
            for (const cloudCategory of cloudCategories) {
                const localData = mapToLocalFormat('categories', cloudCategory);
                await mergeLocalData('categories', localData, pendingDeletes);
                stats.pulled.categories++;
            }
        }

        // Time Entries pullen
        const { data: cloudEntries } = await SupabaseClient.fetchUserData('time_entries');
        if (cloudEntries) {
            for (const cloudEntry of cloudEntries) {
                const localData = mapToLocalFormat('timeEntries', cloudEntry);
                await mergeLocalData('timeEntries', localData, pendingDeletes);
                stats.pulled.timeEntries++;
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
            updated_at: new Date().toISOString()
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
                    name: localData.name
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
            createdAt: new Date(cloudData.created_at).getTime()
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
                    name: cloudData.name
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
     * Merged Cloud-Daten in lokale DB (Last-Write-Wins)
     * @param {string} type 
     * @param {Object} data 
     */
    async function mergeLocalData(type, data, pendingDeletes = null) {
        // Lokal gelöscht, aber noch nicht in Cloud gesynct: nicht wieder einfügen
        if (pendingDeletes && pendingDeletes.has(type + ':' + data.id)) {
            return;
        }

        // Prüfen ob Eintrag lokal existiert
        let existingData = null;
        
        try {
            switch (type) {
                case 'companies':
                    existingData = await DB.getCompany(data.id);
                    break;
                case 'categories':
                    existingData = await DB.getCategory(data.id);
                    break;
                case 'timeEntries':
                    existingData = await DB.getTimeEntry(data.id);
                    break;
            }
        } catch (e) {
            existingData = null;
        }

        // Wenn nicht existiert, hinzufügen
        if (!existingData) {
            switch (type) {
                case 'companies':
                    await DB.addCompany(data);
                    break;
                case 'categories':
                    await DB.addCategory(data);
                    break;
                case 'timeEntries':
                    await DB.addTimeEntry(data);
                    break;
            }
        }
        // Wenn existiert und Cloud neuer, aktualisieren (LWW)
        // Für diese einfache Implementierung: Cloud gewinnt immer
    }

    /**
     * Führt eine initiale Migration lokaler Daten zur Cloud durch
     * (Wird nach dem ersten Login aufgerufen)
     * @returns {Promise<Object>} { success, stats }
     */
    async function migrateLocalToCloud() {
        if (!Auth.isCloudMode()) {
            return { success: false, reason: 'not_cloud_mode' };
        }

        notifyListeners({ type: 'migration_start' });

        try {
            const stats = {
                companies: 0,
                categories: 0,
                timeEntries: 0
            };

            const localData = await DB.getAllData();
            const userId = Auth.getUserId();

            // Companies migrieren
            for (const company of localData.companies) {
                const cloudData = mapToCloudFormat('companies', company, userId);
                const { error } = await SupabaseClient.insertUserData('companies', cloudData);
                if (!error) {
                    stats.companies++;
                }
            }

            // Categories migrieren
            for (const category of localData.categories) {
                const cloudData = mapToCloudFormat('categories', category, userId);
                const { error } = await SupabaseClient.insertUserData('categories', cloudData);
                if (!error) {
                    stats.categories++;
                }
            }

            // Time Entries migrieren
            for (const entry of localData.timeEntries) {
                const cloudData = mapToCloudFormat('timeEntries', entry, userId);
                const { error } = await SupabaseClient.insertUserData('time_entries', cloudData);
                if (!error) {
                    stats.timeEntries++;
                }
            }

            notifyListeners({ type: 'migration_complete', stats });
            return { success: true, stats };
        } catch (error) {
            console.error('Migration Fehler:', error);
            notifyListeners({ type: 'migration_error', error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * Lädt alle Daten aus der Cloud und ersetzt lokale Daten
     * @returns {Promise<Object>} { success, stats }
     */
    async function pullFromCloud() {
        if (!Auth.isCloudMode()) {
            return { success: false, reason: 'not_cloud_mode' };
        }

        try {
            // Lokale Daten löschen
            await DB.deleteAllData();

            // Cloud-Daten pullen
            const stats = { companies: 0, categories: 0, timeEntries: 0 };
            
            const { data: companies } = await SupabaseClient.fetchUserData('companies');
            if (companies) {
                for (const c of companies) {
                    await DB.addCompany(mapToLocalFormat('companies', c));
                    stats.companies++;
                }
            }

            const { data: categories } = await SupabaseClient.fetchUserData('categories');
            if (categories) {
                for (const c of categories) {
                    await DB.addCategory(mapToLocalFormat('categories', c));
                    stats.categories++;
                }
            }

            const { data: entries } = await SupabaseClient.fetchUserData('time_entries');
            if (entries) {
                for (const e of entries) {
                    await DB.addTimeEntry(mapToLocalFormat('timeEntries', e));
                    stats.timeEntries++;
                }
            }

            return { success: true, stats };
        } catch (error) {
            console.error('Pull from Cloud Error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Gibt den aktuellen Sync-State zurück
     * @returns {Object}
     */
    function getState() {
        return {
            state: currentState,
            lastSync: lastSyncTime,
            pending: pendingChanges,
            isOnline: SupabaseClient.isOnline()
        };
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
        migrateLocalToCloud,
        pullFromCloud,
        pullDeltaChanges,
        pushPendingChanges,
        onSyncChange,
        getState,
        getLastSyncFormatted,
        startAutoSync,
        stopAutoSync,
        SYNC_STATE
    };
})();
