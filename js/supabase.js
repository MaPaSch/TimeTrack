/**
 * TimeTrack PWA - Supabase Client
 * Wrapper für Supabase-Operationen
 */

const SupabaseClient = (function() {
    'use strict';

    let client = null;
    let isInitialized = false;

    /**
     * Initialisiert den Supabase Client
     * @returns {boolean} true wenn erfolgreich initialisiert
     */
    function init() {
        if (isInitialized) {
            return true;
        }

        if (!Config.isSupabaseConfigured()) {
            console.warn('Supabase ist nicht konfiguriert. Cloud-Sync deaktiviert.');
            return false;
        }

        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.warn('Supabase SDK nicht geladen. Cloud-Sync deaktiviert.');
            return false;
        }

        try {
            client = supabase.createClient(Config.SUPABASE_URL, Config.SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    storage: window.localStorage
                }
            });
            isInitialized = true;
            return true;
        } catch (error) {
            console.error('Fehler bei Supabase-Initialisierung:', error);
            return false;
        }
    }

    /**
     * Gibt den Supabase Client zurück
     * @returns {Object|null}
     */
    function getClient() {
        if (!isInitialized) {
            init();
        }
        return client;
    }

    /**
     * Prüft ob der Client verfügbar ist
     * @returns {boolean}
     */
    function isAvailable() {
        return isInitialized && client !== null;
    }

    /**
     * Prüft ob eine Internetverbindung besteht
     * @returns {boolean}
     */
    function isOnline() {
        return navigator.onLine;
    }

    // ========================================
    // Auth Wrapper Funktionen
    // ========================================

    /**
     * Gibt die aktuelle Session zurück
     * @returns {Promise<Object|null>}
     */
    async function getSession() {
        if (!isAvailable()) return null;
        
        try {
            const { data: { session }, error } = await client.auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Fehler beim Laden der Session:', error);
            return null;
        }
    }

    /**
     * Gibt den aktuellen User zurück
     * @returns {Promise<Object|null>}
     */
    async function getUser() {
        const session = await getSession();
        return session?.user || null;
    }

    /**
     * Registriert einen neuen Benutzer
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} { data, error }
     */
    async function signUp(email, password) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        try {
            const { data, error } = await client.auth.signUp({
                email,
                password
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Meldet einen Benutzer an
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} { data, error }
     */
    async function signIn(email, password) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        try {
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Meldet den Benutzer ab
     * @returns {Promise<Object>} { error }
     */
    async function signOut() {
        if (!isAvailable()) {
            return { error: null };
        }

        try {
            const { error } = await client.auth.signOut();
            return { error };
        } catch (error) {
            return { error };
        }
    }

    /**
     * Sendet E-Mail zum Zurücksetzen des Passworts
     * @param {string} email - E-Mail-Adresse des Benutzers
     * @param {string} redirectTo - URL, auf die nach Klick auf den Link weitergeleitet wird
     * @returns {Promise<Object>} { data, error }
     */
    async function resetPasswordForEmail(email, redirectTo) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        try {
            const { data, error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '')
            });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Aktualisiert den Benutzer (z. B. neues Passwort nach Recovery)
     * @param {Object} attributes - z. B. { password: string }
     * @returns {Promise<Object>} { data, error }
     */
    async function updateUser(attributes) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        try {
            const { data, error } = await client.auth.updateUser(attributes);
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Registriert einen Auth State Change Listener
     * @param {Function} callback - (event, session) => void
     * @returns {Object} { data: { subscription } }
     */
    function onAuthStateChange(callback) {
        if (!isAvailable()) {
            return { data: { subscription: { unsubscribe: () => {} } } };
        }

        return client.auth.onAuthStateChange(callback);
    }

    // ========================================
    // Database Wrapper Funktionen
    // ========================================

    // ========================================
    // Sync Helper Funktionen
    // ========================================

    /**
     * Lädt alle Daten einer Tabelle für den aktuellen User
     * @param {string} table 
     * @returns {Promise<Object>} { data, error }
     */
    async function fetchUserData(table) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        const user = await getUser();
        if (!user) {
            return { data: null, error: { message: 'Nicht angemeldet' } };
        }

        try {
            const { data, error } = await client
                .from(table)
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Fügt Daten in eine Tabelle ein (mit user_id)
     * @param {string} table 
     * @param {Object|Array} records 
     * @returns {Promise<Object>} { data, error }
     */
    async function insertUserData(table, records) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        const user = await getUser();
        if (!user) {
            return { data: null, error: { message: 'Nicht angemeldet' } };
        }

        const recordsArray = Array.isArray(records) ? records : [records];
        const recordsWithUserId = recordsArray.map(record => ({
            ...record,
            user_id: user.id
        }));

        try {
            const { data, error } = await client
                .from(table)
                .insert(recordsWithUserId)
                .select();
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Aktualisiert Daten in einer Tabelle
     * @param {string} table 
     * @param {string} id 
     * @param {Object} updates 
     * @returns {Promise<Object>} { data, error }
     */
    async function updateUserData(table, id, updates) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        const user = await getUser();
        if (!user) {
            return { data: null, error: { message: 'Nicht angemeldet' } };
        }

        try {
            const { data, error } = await client
                .from(table)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('user_id', user.id)
                .select();
            
            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Soft-Delete: Setzt deleted_at statt zu löschen
     * @param {string} table 
     * @param {string} id 
     * @returns {Promise<Object>} { data, error }
     */
    async function softDeleteUserData(table, id) {
        return updateUserData(table, id, {
            deleted_at: new Date().toISOString()
        });
    }

    /**
     * Upsert (Insert or Update) mit user_id
     * @param {string} table 
     * @param {Object|Array} records 
     * @returns {Promise<Object>} { data, error }
     */
    async function upsertUserData(table, records) {
        if (!isAvailable()) {
            return { data: null, error: { message: 'Supabase nicht verfügbar' } };
        }

        const user = await getUser();
        if (!user) {
            return { data: null, error: { message: 'Nicht angemeldet' } };
        }

        const recordsArray = Array.isArray(records) ? records : [records];
        const recordsWithUserId = recordsArray.map(record => ({
            ...record,
            user_id: user.id,
            updated_at: new Date().toISOString()
        }));

        try {
            // Workaround: Direkter REST-API Aufruf um das SDK columns-Parameter Bug zu umgehen
            const session = await getSession();
            const response = await fetch(
                `${Config.SUPABASE_URL}/rest/v1/${table}?on_conflict=id`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': Config.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Prefer': 'resolution=merge-duplicates,return=representation'
                    },
                    body: JSON.stringify(recordsWithUserId)
                }
            );
            
            const responseData = await response.json();
            
            if (!response.ok) {
                return { data: null, error: responseData };
            }
            return { data: responseData, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Löscht alle Daten des aktuellen Benutzers permanent aus der Cloud
     * @returns {Promise<Object>} { success, error }
     */
    async function hardDeleteAllUserData() {
        if (!isAvailable()) {
            return { success: false, error: { message: 'Supabase nicht verfügbar' } };
        }

        const user = await getUser();
        if (!user) {
            return { success: false, error: { message: 'Nicht angemeldet' } };
        }

        try {
            // Textbausteine (Tabelle existiert erst nach Migration v3 – Fehler nur loggen)
            const { error: snippetsError } = await client
                .from('text_snippets')
                .delete()
                .eq('user_id', user.id);

            if (snippetsError) {
                console.warn('Textbausteine konnten nicht gelöscht werden:', snippetsError);
            }

            // Reihenfolge wichtig wegen Foreign Keys: erst Einträge, dann Kategorien, dann Unternehmen
            const { error: entriesError } = await client
                .from('time_entries')
                .delete()
                .eq('user_id', user.id);
            
            if (entriesError) {
                console.error('Fehler beim Löschen der Zeit-Einträge:', entriesError);
                return { success: false, error: entriesError };
            }

            const { error: categoriesError } = await client
                .from('categories')
                .delete()
                .eq('user_id', user.id);
            
            if (categoriesError) {
                console.error('Fehler beim Löschen der Kategorien:', categoriesError);
                return { success: false, error: categoriesError };
            }

            const { error: companiesError } = await client
                .from('companies')
                .delete()
                .eq('user_id', user.id);
            
            if (companiesError) {
                console.error('Fehler beim Löschen der Unternehmen:', companiesError);
                return { success: false, error: companiesError };
            }

            return { success: true };
        } catch (error) {
            console.error('Fehler beim Löschen aller Cloud-Daten:', error);
            return { success: false, error };
        }
    }

    return {
        init,
        getClient,
        isAvailable,
        isOnline,
        // Auth
        getSession,
        getUser,
        signUp,
        signIn,
        signOut,
        resetPasswordForEmail,
        updateUser,
        onAuthStateChange,
        // Database
        fetchUserData,
        insertUserData,
        updateUserData,
        softDeleteUserData,
        upsertUserData,
        hardDeleteAllUserData
    };
})();
