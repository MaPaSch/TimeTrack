/**
 * TimeTrack PWA - Authentifizierung
 * Verwaltung von Login, Registrierung und Session
 */

const Auth = (function() {
    'use strict';

    // Auth State
    let currentUser = null;
    let currentSession = null;
    let authStateListeners = [];

    // Auth Modi
    const AUTH_MODE = {
        LOCAL: 'local',    // Nur lokale Daten, keine Cloud
        CLOUD: 'cloud'     // Mit Cloud-Synchronisation
    };

    let currentMode = AUTH_MODE.LOCAL;

    /**
     * Initialisiert das Auth-Modul
     * @returns {Promise<void>}
     */
    async function init() {
        // Prüfen ob Supabase verfügbar ist
        if (!SupabaseClient.isAvailable()) {
            console.log('Auth: Lokaler Modus (Supabase nicht verfügbar)');
            currentMode = AUTH_MODE.LOCAL;
            notifyListeners('LOCAL_MODE', null);
            return;
        }

        // Session laden
        try {
            const session = await SupabaseClient.getSession();
            if (session) {
                currentSession = session;
                currentUser = session.user;
                currentMode = AUTH_MODE.CLOUD;
                console.log('Auth: Cloud-Modus aktiv für', currentUser.email);
                notifyListeners('SIGNED_IN', session);
            } else {
                currentMode = AUTH_MODE.LOCAL;
                notifyListeners('SIGNED_OUT', null);
            }
        } catch (error) {
            console.error('Auth: Fehler beim Laden der Session:', error);
            currentMode = AUTH_MODE.LOCAL;
        }

        // Auth State Changes überwachen
        SupabaseClient.onAuthStateChange((event, session) => {
            handleAuthStateChange(event, session);
        });
    }

    /**
     * Behandelt Auth State Changes von Supabase
     * @param {string} event 
     * @param {Object} session 
     */
    function handleAuthStateChange(event, session) {
        console.log('Auth State Change:', event);
        
        switch (event) {
            case 'SIGNED_IN':
            case 'INITIAL_SESSION':
                if (session) {
                    currentSession = session;
                    currentUser = session.user;
                    currentMode = AUTH_MODE.CLOUD;
                } else {
                    currentSession = null;
                    currentUser = null;
                    currentMode = AUTH_MODE.LOCAL;
                }
                break;
            case 'SIGNED_OUT':
                currentSession = null;
                currentUser = null;
                currentMode = AUTH_MODE.LOCAL;
                break;
            case 'TOKEN_REFRESHED':
                currentSession = session;
                break;
            case 'USER_UPDATED':
                currentUser = session?.user || null;
                break;
        }

        notifyListeners(event, session);
    }

    /**
     * Benachrichtigt alle Listener über Auth-Änderungen
     * @param {string} event 
     * @param {Object} session 
     */
    function notifyListeners(event, session) {
        authStateListeners.forEach(listener => {
            try {
                listener(event, session, currentUser);
            } catch (error) {
                console.error('Auth Listener Error:', error);
            }
        });
    }

    /**
     * Registriert einen Auth State Listener
     * @param {Function} callback - (event, session, user) => void
     * @returns {Function} Unsubscribe-Funktion
     */
    function onAuthStateChange(callback) {
        authStateListeners.push(callback);
        
        // Sofort mit aktuellem State aufrufen
        const event = currentMode === AUTH_MODE.CLOUD ? 'SIGNED_IN' : 'SIGNED_OUT';
        callback(event, currentSession, currentUser);
        
        // Unsubscribe-Funktion zurückgeben
        return () => {
            authStateListeners = authStateListeners.filter(l => l !== callback);
        };
    }

    /**
     * Registriert einen neuen Benutzer
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} { success, error }
     */
    async function signUp(email, password) {
        if (!SupabaseClient.isAvailable()) {
            return { 
                success: false, 
                error: 'Cloud-Funktionen sind nicht verfügbar. Bitte überprüfen Sie die Konfiguration.' 
            };
        }

        if (!SupabaseClient.isOnline()) {
            return { 
                success: false, 
                error: 'Keine Internetverbindung. Bitte versuchen Sie es später erneut.' 
            };
        }

        // Validierung
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' };
        }

        if (!password || password.length < 6) {
            return { success: false, error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' };
        }

        try {
            const { data, error } = await SupabaseClient.signUp(email, password);
            
            if (error) {
                return { 
                    success: false, 
                    error: translateAuthError(error) 
                };
            }

            // Bei manchen Supabase-Konfigurationen muss E-Mail bestätigt werden
            if (data?.user && !data.session) {
                return { 
                    success: true, 
                    needsConfirmation: true,
                    message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.'
                };
            }

            return { success: true };
        } catch (error) {
            console.error('SignUp Error:', error);
            return { 
                success: false, 
                error: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' 
            };
        }
    }

    /**
     * Meldet einen Benutzer an
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<Object>} { success, error, isFirstLogin }
     */
    async function signIn(email, password) {
        if (!SupabaseClient.isAvailable()) {
            return { 
                success: false, 
                error: 'Cloud-Funktionen sind nicht verfügbar. Bitte überprüfen Sie die Konfiguration.' 
            };
        }

        if (!SupabaseClient.isOnline()) {
            return { 
                success: false, 
                error: 'Keine Internetverbindung. Bitte versuchen Sie es später erneut.' 
            };
        }

        // Validierung
        if (!email || !password) {
            return { success: false, error: 'Bitte geben Sie E-Mail und Passwort ein.' };
        }

        try {
            const { data, error } = await SupabaseClient.signIn(email, password);
            
            if (error) {
                return { 
                    success: false, 
                    error: translateAuthError(error) 
                };
            }

            // Prüfen ob es der erste Login ist (keine Daten in der Cloud)
            const isFirstLogin = await checkFirstLogin();

            return { 
                success: true, 
                isFirstLogin 
            };
        } catch (error) {
            console.error('SignIn Error:', error);
            return { 
                success: false, 
                error: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.' 
            };
        }
    }

    /**
     * Prüft ob es der erste Login ist (keine Daten in Cloud)
     * @returns {Promise<boolean>}
     */
    async function checkFirstLogin() {
        try {
            const { data: companies } = await SupabaseClient.fetchUserData('companies');
            return !companies || companies.length === 0;
        } catch (error) {
            return true;
        }
    }

    /**
     * Sendet E-Mail zum Zurücksetzen des Passworts
     * @param {string} email - E-Mail-Adresse
     * @param {string} [redirectTo] - Optional: Redirect-URL nach Klick auf Link (z. B. aus Config.getPasswordResetRedirectUrl())
     * @returns {Promise<Object>} { success, error }
     */
    async function resetPasswordForEmail(email, redirectTo) {
        if (!SupabaseClient.isAvailable()) {
            return {
                success: false,
                error: 'Cloud-Funktionen sind nicht verfügbar. Bitte überprüfen Sie die Konfiguration.'
            };
        }

        if (!SupabaseClient.isOnline()) {
            return {
                success: false,
                error: 'Keine Internetverbindung. Bitte versuchen Sie es später erneut.'
            };
        }

        if (!email || !email.includes('@')) {
            return { success: false, error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' };
        }

        const redirectUrl = (typeof redirectTo === 'string' && redirectTo.trim() !== '')
            ? redirectTo.trim()
            : (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '');

        try {
            const { error } = await SupabaseClient.resetPasswordForEmail(email, redirectUrl);

            if (error) {
                return { success: false, error: translateAuthError(error) };
            }

            return { success: true };
        } catch (error) {
            console.error('ResetPasswordForEmail Error:', error);
            return {
                success: false,
                error: 'Link konnte nicht gesendet werden. Bitte versuchen Sie es erneut.'
            };
        }
    }

    /**
     * Setzt ein neues Passwort (nach Klick auf Reset-Link in E-Mail)
     * @param {string} newPassword - Neues Passwort (min. 6 Zeichen)
     * @returns {Promise<Object>} { success, error }
     */
    async function updatePassword(newPassword) {
        if (!SupabaseClient.isAvailable()) {
            return {
                success: false,
                error: 'Cloud-Funktionen sind nicht verfügbar.'
            };
        }

        if (!newPassword || newPassword.length < 6) {
            return { success: false, error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' };
        }

        try {
            const { error } = await SupabaseClient.updateUser({ password: newPassword });

            if (error) {
                return { success: false, error: translateAuthError(error) };
            }

            return { success: true };
        } catch (error) {
            console.error('UpdatePassword Error:', error);
            return {
                success: false,
                error: 'Passwort konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.'
            };
        }
    }

    /**
     * Meldet den Benutzer ab
     * @returns {Promise<Object>} { success, error }
     */
    async function signOut() {
        try {
            const { error } = await SupabaseClient.signOut();
            
            if (error) {
                return { success: false, error: 'Abmeldung fehlgeschlagen.' };
            }

            currentUser = null;
            currentSession = null;
            currentMode = AUTH_MODE.LOCAL;

            return { success: true };
        } catch (error) {
            console.error('SignOut Error:', error);
            return { success: false, error: 'Abmeldung fehlgeschlagen.' };
        }
    }

    /**
     * Übersetzt Supabase Auth-Fehler in benutzerfreundliche Meldungen
     * @param {Object} error 
     * @returns {string}
     */
    function translateAuthError(error) {
        const message = error.message || error.error_description || '';
        const code = error.code || error.status || '';
        
        const translations = {
            'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
            'Email not confirmed': 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.',
            'User already registered': 'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.',
            'Password should be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen lang sein.',
            'Unable to validate email address: invalid format': 'Ungültiges E-Mail-Format.',
            'Email rate limit exceeded': 'Zu viele Versuche. Bitte warten Sie einen Moment.',
            'Network error': 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
            'A user with this email address has already been registered': 'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.',
            'User with this email already exists': 'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.',
            'email_exists': 'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.',
            'user_already_exists': 'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.'
        };

        // Prüfe auf exakte Übereinstimmung
        if (translations[message]) {
            return translations[message];
        }

        // Prüfe auf Fehlercode
        if (translations[code]) {
            return translations[code];
        }

        // Prüfe auf Teilstrings für robustere Erkennung
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('already registered') || 
            lowerMessage.includes('already exists') ||
            lowerMessage.includes('email_exists') ||
            lowerMessage.includes('duplicate')) {
            return 'Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.';
        }

        if (lowerMessage.includes('invalid') && lowerMessage.includes('credentials')) {
            return 'E-Mail oder Passwort ist falsch.';
        }

        if (lowerMessage.includes('not confirmed') || lowerMessage.includes('email confirmation')) {
            return 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.';
        }

        return message || 'Ein unbekannter Fehler ist aufgetreten.';
    }

    /**
     * Gibt den aktuellen Benutzer zurück
     * @returns {Object|null}
     */
    function getUser() {
        return currentUser;
    }

    /**
     * Gibt die aktuelle Session zurück
     * @returns {Object|null}
     */
    function getSession() {
        return currentSession;
    }

    /**
     * Prüft ob ein Benutzer angemeldet ist
     * @returns {boolean}
     */
    function isLoggedIn() {
        return currentUser !== null && currentMode === AUTH_MODE.CLOUD;
    }

    /**
     * Gibt den aktuellen Auth-Modus zurück
     * @returns {string} 'local' oder 'cloud'
     */
    function getMode() {
        return currentMode;
    }

    /**
     * Prüft ob Cloud-Modus aktiv ist
     * @returns {boolean}
     */
    function isCloudMode() {
        return currentMode === AUTH_MODE.CLOUD;
    }

    /**
     * Gibt die User-ID zurück (oder null)
     * @returns {string|null}
     */
    function getUserId() {
        return currentUser?.id || null;
    }

    /**
     * Gibt die User-Email zurück (oder null)
     * @returns {string|null}
     */
    function getUserEmail() {
        return currentUser?.email || null;
    }

    return {
        init,
        onAuthStateChange,
        signUp,
        signIn,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        getUser,
        getSession,
        isLoggedIn,
        getMode,
        isCloudMode,
        getUserId,
        getUserEmail,
        AUTH_MODE
    };
})();
