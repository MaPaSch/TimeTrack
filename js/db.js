/**
 * TimeTrack PWA - IndexedDB Wrapper
 * Lokale Datenspeicherung mit IndexedDB
 */

const DB = (function() {
    'use strict';

    const DB_NAME = 'TimeTrackDB';
    const DB_VERSION = 2; // Version erhöht für Sync-Metadaten
    
    const STORES = {
        COMPANIES: 'companies',
        CATEGORIES: 'categories',
        TIME_ENTRIES: 'timeEntries',
        SYNC_QUEUE: 'syncQueue' // NEU: Ausstehende Sync-Operationen
    };

    // Sync-States für Einträge
    const SYNC_STATE = {
        SYNCED: 'synced',
        PENDING: 'pending',
        CONFLICT: 'conflict',
        ERROR: 'error'
    };

    let db = null;

    /**
     * Initialisiert die Datenbank
     * @returns {Promise<IDBDatabase>}
     */
    function initDB() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Datenbank konnte nicht geöffnet werden'));
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                const oldVersion = event.oldVersion;

                // Companies Store
                if (!database.objectStoreNames.contains(STORES.COMPANIES)) {
                    const companiesStore = database.createObjectStore(STORES.COMPANIES, { keyPath: 'id' });
                    companiesStore.createIndex('name', 'name', { unique: false });
                    companiesStore.createIndex('createdAt', 'createdAt', { unique: false });
                    companiesStore.createIndex('syncState', 'syncState', { unique: false });
                }

                // Categories Store
                if (!database.objectStoreNames.contains(STORES.CATEGORIES)) {
                    const categoriesStore = database.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
                    categoriesStore.createIndex('name', 'name', { unique: false });
                    categoriesStore.createIndex('createdAt', 'createdAt', { unique: false });
                    categoriesStore.createIndex('syncState', 'syncState', { unique: false });
                }

                // Time Entries Store
                if (!database.objectStoreNames.contains(STORES.TIME_ENTRIES)) {
                    const entriesStore = database.createObjectStore(STORES.TIME_ENTRIES, { keyPath: 'id' });
                    entriesStore.createIndex('companyId', 'companyId', { unique: false });
                    entriesStore.createIndex('categoryId', 'categoryId', { unique: false });
                    entriesStore.createIndex('date', 'date', { unique: false });
                    entriesStore.createIndex('syncState', 'syncState', { unique: false });
                }

                // Sync Queue Store (NEU in Version 2)
                if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncQueueStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
                    syncQueueStore.createIndex('entityType', 'entityType', { unique: false });
                    syncQueueStore.createIndex('entityId', 'entityId', { unique: false });
                    syncQueueStore.createIndex('operation', 'operation', { unique: false });
                    syncQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Migration: Sync-Indizes zu bestehenden Stores hinzufügen (Version 1 -> 2)
                if (oldVersion < 2) {
                    const transaction = event.target.transaction;
                    
                    // Prüfen und Indizes hinzufügen falls nicht vorhanden
                    const addSyncIndexIfNeeded = (storeName) => {
                        const store = transaction.objectStore(storeName);
                        if (!store.indexNames.contains('syncState')) {
                            store.createIndex('syncState', 'syncState', { unique: false });
                        }
                    };

                    if (database.objectStoreNames.contains(STORES.COMPANIES)) {
                        addSyncIndexIfNeeded(STORES.COMPANIES);
                    }
                    if (database.objectStoreNames.contains(STORES.CATEGORIES)) {
                        addSyncIndexIfNeeded(STORES.CATEGORIES);
                    }
                    if (database.objectStoreNames.contains(STORES.TIME_ENTRIES)) {
                        addSyncIndexIfNeeded(STORES.TIME_ENTRIES);
                    }
                }
            };
        });
    }

    /**
     * Prüft und fügt Standarddaten hinzu
     * @returns {Promise<void>}
     */
    async function seedDefaultData() {
        // Keine Standard-Unternehmen mehr - Benutzer legt eigene an
    }

    /**
     * Generische Get-All Funktion
     * @param {string} storeName 
     * @returns {Promise<Array>}
     */
    function getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Fehler beim Laden aus ${storeName}`));
        });
    }

    /**
     * Generische Get-By-ID Funktion
     * @param {string} storeName 
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    function getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error(`Fehler beim Laden von ${storeName}/${id}`));
        });
    }

    /**
     * Generische Add Funktion (mit Sync-Metadaten)
     * @param {string} storeName 
     * @param {Object} item 
     * @returns {Promise<Object>}
     */
    function add(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const now = Date.now();
            const itemWithId = {
                ...item,
                id: item.id || Utils.generateId(),
                createdAt: item.createdAt || now,
                updatedAt: item.updatedAt || now,
                syncState: item.syncState || SYNC_STATE.PENDING
            };

            const request = store.add(itemWithId);

            request.onsuccess = () => {
                window.dispatchEvent(new CustomEvent('dataChanged', { 
                    detail: { store: storeName, id: itemWithId.id, operation: 'add' }
                }));
                resolve(itemWithId);
            };
            request.onerror = () => reject(new Error(`Fehler beim Speichern in ${storeName}`));
        });
    }

    /**
     * Generische Update Funktion (mit Sync-Metadaten)
     * @param {string} storeName 
     * @param {Object} item 
     * @returns {Promise<Object>}
     */
    function update(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const updatedItem = {
                ...item,
                updatedAt: Date.now(),
                syncState: item.syncState || SYNC_STATE.PENDING
            };
            
            const request = store.put(updatedItem);

            request.onsuccess = () => {
                window.dispatchEvent(new CustomEvent('dataChanged', { 
                    detail: { store: storeName, id: updatedItem.id, operation: 'update' }
                }));
                resolve(updatedItem);
            };
            request.onerror = () => reject(new Error(`Fehler beim Aktualisieren in ${storeName}`));
        });
    }

    /**
     * Generische Delete Funktion
     * @param {string} storeName 
     * @param {string} id 
     * @returns {Promise<void>}
     */
    function remove(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                window.dispatchEvent(new CustomEvent('dataChanged', { 
                    detail: { store: storeName, id: id, operation: 'delete' }
                }));
                resolve();
            };
            request.onerror = () => reject(new Error(`Fehler beim Löschen aus ${storeName}`));
        });
    }

    // ========================================
    // Companies API
    // ========================================

    /**
     * Lädt alle Unternehmen
     * @returns {Promise<Array>}
     */
    function getCompanies() {
        return getAll(STORES.COMPANIES);
    }

    /**
     * Lädt ein Unternehmen nach ID
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    function getCompany(id) {
        return getById(STORES.COMPANIES, id);
    }

    /**
     * Fügt ein Unternehmen hinzu
     * @param {Object} company - { name: string }
     * @returns {Promise<Object>}
     */
    function addCompany(company) {
        return add(STORES.COMPANIES, company);
    }

    /**
     * Löscht ein Unternehmen
     * @param {string} id 
     * @returns {Promise<void>}
     */
    function deleteCompany(id) {
        return remove(STORES.COMPANIES, id);
    }

    // ========================================
    // Categories API
    // ========================================

    /**
     * Lädt alle Kategorien (sortiert nach Erstellungsdatum)
     * @returns {Promise<Array>}
     */
    async function getCategories() {
        const categories = await getAll(STORES.CATEGORIES);
        return categories.sort((a, b) => a.createdAt - b.createdAt);
    }

    /**
     * Lädt eine Kategorie nach ID
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    function getCategory(id) {
        return getById(STORES.CATEGORIES, id);
    }

    /**
     * Fügt eine Kategorie hinzu
     * @param {Object} category - { name: string }
     * @returns {Promise<Object>}
     */
    function addCategory(category) {
        return add(STORES.CATEGORIES, category);
    }

    /**
     * Löscht eine Kategorie
     * @param {string} id 
     * @returns {Promise<void>}
     */
    function deleteCategory(id) {
        return remove(STORES.CATEGORIES, id);
    }

    // ========================================
    // Time Entries API
    // ========================================

    /**
     * Lädt alle Zeiteinträge
     * @param {Object} filters - { companyId?, categoryId?, dateRange? }
     * @returns {Promise<Array>}
     */
    async function getTimeEntries(filters = {}) {
        let entries = await getAll(STORES.TIME_ENTRIES);

        // Filter nach Unternehmen
        if (filters.companyId && filters.companyId !== 'all') {
            entries = entries.filter(e => e.companyId === filters.companyId);
        }

        // Filter nach Kategorie
        if (filters.categoryId && filters.categoryId !== 'all') {
            entries = entries.filter(e => e.categoryId === filters.categoryId);
        }

        // Filter nach Zeitraum
        if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            entries = entries.filter(e => e.date >= start && e.date < end);
        }

        // Nach Datum sortieren (neueste zuerst)
        entries.sort((a, b) => b.startTime - a.startTime);

        return entries;
    }

    /**
     * Lädt einen Zeiteintrag nach ID
     * @param {string} id 
     * @returns {Promise<Object>}
     */
    function getTimeEntry(id) {
        return getById(STORES.TIME_ENTRIES, id);
    }

    /**
     * Fügt einen Zeiteintrag hinzu
     * @param {Object} entry - { companyId, categoryId?, date, startTime, endTime, duration, note? }
     * @returns {Promise<Object>}
     */
    function addTimeEntry(entry) {
        return add(STORES.TIME_ENTRIES, entry);
    }

    /**
     * Aktualisiert einen Zeiteintrag
     * @param {Object} entry 
     * @returns {Promise<Object>}
     */
    function updateTimeEntry(entry) {
        return update(STORES.TIME_ENTRIES, entry);
    }

    /**
     * Löscht einen Zeiteintrag
     * @param {string} id 
     * @returns {Promise<void>}
     */
    function deleteTimeEntry(id) {
        return remove(STORES.TIME_ENTRIES, id);
    }

    /**
     * Zählt Einträge für ein Unternehmen
     * @param {string} companyId 
     * @returns {Promise<number>}
     */
    async function countEntriesForCompany(companyId) {
        const entries = await getTimeEntries({ companyId });
        return entries.length;
    }

    /**
     * Zählt Einträge für eine Kategorie
     * @param {string} categoryId 
     * @returns {Promise<number>}
     */
    async function countEntriesForCategory(categoryId) {
        const entries = await getAll(STORES.TIME_ENTRIES);
        return entries.filter(e => e.categoryId === categoryId).length;
    }

    /**
     * Löscht alle Daten aus einem Store
     * @param {string} storeName 
     * @returns {Promise<void>}
     */
    function clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Fehler beim Leeren von ${storeName}`));
        });
    }

    /**
     * Löscht alle Daten aus der Datenbank
     * @returns {Promise<void>}
     */
    async function deleteAllData() {
        await clearStore(STORES.COMPANIES);
        await clearStore(STORES.CATEGORIES);
        await clearStore(STORES.TIME_ENTRIES);
    }

    // ========================================
    // Import/Export API
    // ========================================

    /**
     * Lädt alle Daten für Export
     * @returns {Promise<Object>} { companies, categories, timeEntries }
     */
    async function getAllData() {
        const companies = await getAll(STORES.COMPANIES);
        const categories = await getAll(STORES.CATEGORIES);
        const timeEntries = await getAll(STORES.TIME_ENTRIES);
        
        return {
            companies,
            categories,
            timeEntries
        };
    }

    /**
     * Importiert Daten mit Merge-Logik (bestehende behalten, neue hinzufügen)
     * @param {Object} data - { companies, categories, timeEntries }
     * @returns {Promise<Object>} Statistik { companiesAdded, categoriesAdded, entriesAdded, skipped }
     */
    async function importData(data) {
        const stats = {
            companiesAdded: 0,
            categoriesAdded: 0,
            entriesAdded: 0,
            skipped: 0
        };

        // Bestehende IDs laden für Duplikat-Erkennung
        const existingCompanies = await getAll(STORES.COMPANIES);
        const existingCategories = await getAll(STORES.CATEGORIES);
        const existingEntries = await getAll(STORES.TIME_ENTRIES);
        
        const existingCompanyIds = new Set(existingCompanies.map(c => c.id));
        const existingCategoryIds = new Set(existingCategories.map(c => c.id));
        const existingEntryIds = new Set(existingEntries.map(e => e.id));

        // Unternehmen importieren
        if (data.companies && Array.isArray(data.companies)) {
            for (const company of data.companies) {
                if (company.id && !existingCompanyIds.has(company.id)) {
                    try {
                        await add(STORES.COMPANIES, company);
                        stats.companiesAdded++;
                    } catch (e) {
                        stats.skipped++;
                    }
                } else {
                    stats.skipped++;
                }
            }
        }

        // Kategorien importieren
        if (data.categories && Array.isArray(data.categories)) {
            for (const category of data.categories) {
                if (category.id && !existingCategoryIds.has(category.id)) {
                    try {
                        await add(STORES.CATEGORIES, category);
                        stats.categoriesAdded++;
                    } catch (e) {
                        stats.skipped++;
                    }
                } else {
                    stats.skipped++;
                }
            }
        }

        // Zeiteinträge importieren
        if (data.timeEntries && Array.isArray(data.timeEntries)) {
            for (const entry of data.timeEntries) {
                if (entry.id && !existingEntryIds.has(entry.id)) {
                    try {
                        await add(STORES.TIME_ENTRIES, entry);
                        stats.entriesAdded++;
                    } catch (e) {
                        stats.skipped++;
                    }
                } else {
                    stats.skipped++;
                }
            }
        }

        return stats;
    }

    // ========================================
    // Sync Queue API
    // ========================================

    /**
     * Fügt eine Operation zur Sync-Queue hinzu
     * @param {string} entityType - 'company', 'category', 'timeEntry'
     * @param {string} entityId - ID der Entität
     * @param {string} operation - 'create', 'update', 'delete'
     * @param {Object} data - Optionale Daten für die Operation
     * @returns {Promise<Object>}
     */
    function addToSyncQueue(entityType, entityId, operation, data = null) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            
            const queueItem = {
                entityType,
                entityId,
                operation,
                data,
                createdAt: Date.now(),
                retryCount: 0
            };

            const request = store.add(queueItem);

            request.onsuccess = () => resolve({ ...queueItem, id: request.result });
            request.onerror = () => reject(new Error('Fehler beim Hinzufügen zur Sync-Queue'));
        });
    }

    /**
     * Lädt alle ausstehenden Sync-Operationen
     * @returns {Promise<Array>}
     */
    function getSyncQueue() {
        return getAll(STORES.SYNC_QUEUE);
    }

    /**
     * Entfernt eine Operation aus der Sync-Queue
     * @param {number} id - Queue-Item ID
     * @returns {Promise<void>}
     */
    function removeFromSyncQueue(id) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Fehler beim Entfernen aus Sync-Queue'));
        });
    }

    /**
     * Leert die gesamte Sync-Queue
     * @returns {Promise<void>}
     */
    function clearSyncQueue() {
        return clearStore(STORES.SYNC_QUEUE);
    }

    /**
     * Aktualisiert den Sync-State einer Entität
     * @param {string} storeName 
     * @param {string} id 
     * @param {string} syncState 
     * @returns {Promise<void>}
     */
    async function updateSyncState(storeName, id, syncState) {
        const item = await getById(storeName, id);
        if (item) {
            item.syncState = syncState;
            item.updatedAt = Date.now();
            await update(storeName, item);
        }
    }

    /**
     * Lädt alle Einträge mit einem bestimmten Sync-State
     * @param {string} storeName 
     * @param {string} syncState 
     * @returns {Promise<Array>}
     */
    function getBySyncState(storeName, syncState) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            // Falls Index existiert, nutzen
            if (store.indexNames.contains('syncState')) {
                const index = store.index('syncState');
                const request = index.getAll(syncState);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(new Error(`Fehler beim Laden aus ${storeName}`));
            } else {
                // Fallback: Alle laden und filtern
                const request = store.getAll();
                request.onsuccess = () => {
                    const filtered = request.result.filter(item => item.syncState === syncState);
                    resolve(filtered);
                };
                request.onerror = () => reject(new Error(`Fehler beim Laden aus ${storeName}`));
            }
        });
    }

    /**
     * Zählt ausstehende Sync-Operationen
     * @returns {Promise<number>}
     */
    async function getPendingSyncCount() {
        const queue = await getSyncQueue();
        return queue.length;
    }

    // Öffentliche API
    return {
        initDB,
        seedDefaultData,
        // Companies
        getCompanies,
        getCompany,
        addCompany,
        deleteCompany,
        countEntriesForCompany,
        // Categories
        getCategories,
        getCategory,
        addCategory,
        deleteCategory,
        countEntriesForCategory,
        // Time Entries
        getTimeEntries,
        getTimeEntry,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        // Bulk Operations
        deleteAllData,
        // Import/Export
        getAllData,
        importData,
        // Sync Queue (NEU)
        addToSyncQueue,
        getSyncQueue,
        removeFromSyncQueue,
        clearSyncQueue,
        updateSyncState,
        getBySyncState,
        getPendingSyncCount,
        SYNC_STATE
    };
})();
