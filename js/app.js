/**
 * TimeTrack PWA - Main Application
 * Hauptlogik, Event-Binding und Initialisierung
 */

const App = (function() {
    'use strict';

    // Daten-Cache
    let companies = [];
    let categories = [];

    // Auth State
    let isAuthenticated = false;

    /** Flag: Nutzer kam von E-Mail-Link zum Passwort-Zurücksetzen */
    let pendingRecoveryRedirect = false;
    /** Flag: Redirect mit Fehler (z. B. Link abgelaufen) */
    let pendingResetLinkError = false;

    /**
     * Lädt alle Daten aus der Datenbank
     */
    async function loadData() {
        try {
            companies = await DB.getCompanies();
            categories = await DB.getCategories();
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            UI.showToast('Fehler beim Laden der Daten', 'error');
        }
    }

    // ========================================
    // Views (Timer, Einträge, Auswertung, Verwaltung)
    // ========================================

    // Kontext für die View-Module
    const viewContext = {
        getCompanies: () => companies,
        getCategories: () => categories,
        reloadData: loadData,
        deleteRecord,
        refreshViews
    };

    /**
     * Lädt alle datenabhängigen Ansichten neu (z. B. nach Sync, Import oder "Alle löschen")
     */
    function refreshViews() {
        EntriesView.refresh();
        AnalysisView.refresh();
        ManagementView.refresh();
    }

    // ========================================
    // Navigation Handler
    // ========================================

    function handleNavigation(viewName) {
        UI.switchView(viewName);

        // Daten für View laden (Filter und Datum bleiben pro Ansicht erhalten)
        if (viewName === 'entries') {
            EntriesView.refresh();
        } else if (viewName === 'analysis') {
            AnalysisView.refresh();
        } else if (viewName === 'management') {
            ManagementView.refresh();
        }
    }

    /**
     * Leere Zähler für Sync.pushPendingChanges
     * @returns {Object}
     */
    function createPushStats() {
        return {
            pushed: { companies: 0, categories: 0, timeEntries: 0, textSnippets: 0 },
            errors: []
        };
    }

    /**
     * Löscht einen Datensatz lokal und (im Cloud-Modus) in der Cloud
     * @param {string} type - 'entry', 'company', 'category', 'snippet'
     * @param {string} id
     */
    async function deleteRecord(type, id) {
        const typeToStore = { entry: 'timeEntries', company: 'companies', category: 'categories', snippet: 'textSnippets' };
        const storeName = typeToStore[type];
        const cloudMode = Auth.isCloudMode();

        // Bei Cloud-Modus Löschung in Sync-Queue eintragen, damit sie in die Cloud übernommen wird
        if (storeName && cloudMode) {
            await DB.addToSyncQueue(storeName, id, 'delete');
        }

        switch (type) {
            case 'entry':
                await DB.deleteTimeEntry(id);
                break;
            case 'company':
                await DB.deleteCompany(id);
                await loadData();
                break;
            case 'category':
                await DB.deleteCategory(id);
                await loadData();
                break;
            case 'snippet':
                await DB.deleteTextSnippet(id);
                break;
        }

        // Bei Cloud-Modus sofort Push auslösen, damit Löschungen in die DB übernommen werden
        if (storeName && cloudMode) {
            Sync.pushPendingChanges(createPushStats()).catch(err => console.error('Sync nach Löschung:', err));
        }
    }

    // ========================================
    // Modal Close Handler
    // ========================================

    function handleModalClose(modal) {
        UI.closeModal(modal);
    }

    // ========================================
    // Event Binding
    // ========================================

    function bindEvents() {
        const els = UI.getElements();

        // Navigation
        els.navItems.forEach(item => {
            item.addEventListener('click', () => {
                handleNavigation(item.dataset.nav);
            });
        });

        // Modal Close Buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    handleModalClose(modal);
                }
            });
        });

        if (els.formLogin) {
            els.formLogin.addEventListener('submit', handleLogin);
        }
        if (els.btnShowRegister) {
            els.btnShowRegister.addEventListener('click', handleShowRegister);
        }
        if (els.btnForgotPassword) {
            els.btnForgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                handleForgotPasswordClick();
            });
        }
        if (els.formForgotPassword) {
            els.formForgotPassword.addEventListener('submit', handleForgotPasswordSubmit);
        }
        if (els.formRegister) {
            els.formRegister.addEventListener('submit', handleRegister);
        }
        if (els.formResetPassword) {
            els.formResetPassword.addEventListener('submit', handleSetNewPassword);
        }
        if (els.btnLogout) {
            els.btnLogout.addEventListener('click', handleLogout);
        }
        if (els.btnSyncNow) {
            els.btnSyncNow.addEventListener('click', handleSyncNow);
        }
        if (els.formChangePassword) {
            els.formChangePassword.addEventListener('submit', handleChangePasswordSubmit);
        }
        if (els.btnShowChangePassword) {
            els.btnShowChangePassword.addEventListener('click', () => UI.showChangePasswordForm());
        }
        if (els.btnCancelChangePassword) {
            els.btnCancelChangePassword.addEventListener('click', () => UI.hideChangePasswordForm());
        }
        
        // ESC schließt Sheets/Modals (dynamische Dialoge und Dropdowns behandelt Components selbst)
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            // Speichern-Sheet: Rückfrage statt direkt schließen
            if (TimerView.isSheetOpen()) {
                TimerView.requestClose();
                return;
            }

            if (EntriesView.isEditSheetOpen()) {
                EntriesView.requestCloseEditSheet();
                return;
            }

            if (document.querySelector('.modal--open')) {
                UI.closeAllModals();
                return;
            }

            // Unterseite der Verwaltung: zurück
            if (ManagementView.isSubpageOpen()) {
                ManagementView.closeSubpage();
            }
        });

        // Prevent iOS bounce
        document.body.addEventListener('touchmove', (e) => {
            if (document.querySelector('.modal--open')) {
                const modal = document.querySelector('.modal--open .modal__content');
                if (modal && !modal.contains(e.target)) {
                    e.preventDefault();
                }
            }
        }, { passive: false });
    }

    // ========================================
    // Profile/Cloud Handlers
    // ========================================

    /**
     * Handler für Login-Formular
     */
    async function handleLogin(event) {
        event.preventDefault();
        
        const els = UI.getElements();
        const email = els.loginEmail.value.trim();
        const password = els.loginPassword.value;

        UI.clearLoginError();
        UI.setLoginLoading(true);

        try {
            const result = await Auth.signIn(email, password);
            
            if (result.success) {
                // Passwort nicht im Formular stehen lassen
                els.loginPassword.value = '';
                UI.showToast('Erfolgreich angemeldet', 'success');
                // Zusammenführen und Hochladen übernimmt der Voll-Sync, den SIGNED_IN startet:
                // lokale Unternehmen/Kategorien/Textbausteine werden dabei per Name den
                // vorhandenen Cloud-Datensätzen zugeordnet (keine Duplikate)
            } else {
                UI.showLoginError(result.error);
            }
        } catch (error) {
            console.error('Login Error:', error);
            UI.showLoginError('Anmeldung fehlgeschlagen');
        } finally {
            UI.setLoginLoading(false);
        }
    }

    /**
     * Handler für Registrieren-Button (öffnet Modal)
     */
    function handleShowRegister() {
        UI.openRegisterModal();
    }

    /**
     * Handler für „Passwort vergessen“-Link (öffnet Modal)
     */
    function handleForgotPasswordClick() {
        UI.openForgotPasswordModal();
    }

    /**
     * Handler für Forgot-Password-Formular (Link senden)
     */
    async function handleForgotPasswordSubmit(event) {
        event.preventDefault();

        const els = UI.getElements();
        const email = els.forgotEmail ? els.forgotEmail.value.trim() : '';

        UI.showForgotPasswordError('');
        UI.showForgotPasswordSuccess('');
        if (!email || !email.includes('@')) {
            UI.showForgotPasswordError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
            return;
        }

        UI.setForgotPasswordLoading(true);

        try {
            const redirectUrl = typeof Config !== 'undefined' && typeof Config.getPasswordResetRedirectUrl === 'function'
                ? Config.getPasswordResetRedirectUrl()
                : undefined;
            const result = await Auth.resetPasswordForEmail(email, redirectUrl);

            if (result.success) {
                UI.showForgotPasswordSuccess('Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.');
                if (els.forgotEmail) els.forgotEmail.value = '';
            } else {
                UI.showForgotPasswordError(result.error || 'Link konnte nicht gesendet werden.');
            }
        } catch (error) {
            console.error('ForgotPassword Error:', error);
            UI.showForgotPasswordError('Link konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
        } finally {
            UI.setForgotPasswordLoading(false);
        }
    }

    /**
     * Handler für „Neues Passwort setzen“-Formular (nach Recovery-Redirect)
     */
    async function handleSetNewPassword(event) {
        event.preventDefault();

        const els = UI.getElements();
        const newPassword = els.resetPasswordNew ? els.resetPasswordNew.value : '';
        const confirmPassword = els.resetPasswordConfirm ? els.resetPasswordConfirm.value : '';

        UI.showResetPasswordError('');

        if (!newPassword || newPassword.length < 6) {
            UI.showResetPasswordError('Das Passwort muss mindestens 6 Zeichen lang sein.');
            return;
        }
        if (newPassword !== confirmPassword) {
            UI.showResetPasswordError('Die Passwörter stimmen nicht überein.');
            return;
        }

        UI.setResetPasswordLoading(true);

        try {
            const result = await Auth.updatePassword(newPassword);

            if (result.success) {
                UI.closeResetPasswordModal();
                UI.showToast('Passwort wurde aktualisiert', 'success');
                UI.updateProfileUI(Auth.isLoggedIn(), Auth.getUser()?.email || '');
            } else {
                UI.showResetPasswordError(result.error || 'Passwort konnte nicht aktualisiert werden.');
            }
        } catch (error) {
            console.error('SetNewPassword Error:', error);
            UI.showResetPasswordError('Passwort konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.');
        } finally {
            UI.setResetPasswordLoading(false);
        }
    }

    /**
     * Handler für Registrierungs-Formular
     */
    async function handleRegister(event) {
        event.preventDefault();
        
        const els = UI.getElements();
        const email = els.registerEmail.value.trim();
        const password = els.registerPassword.value;
        const passwordConfirm = els.registerPasswordConfirm.value;

        UI.clearRegisterError();

        // Passwort-Bestätigung prüfen
        if (password !== passwordConfirm) {
            UI.showRegisterError('Passwörter stimmen nicht überein');
            return;
        }

        UI.setRegisterLoading(true);

        try {
            const result = await Auth.signUp(email, password);
            
            if (result.success) {
                UI.closeRegisterModal();
                
                if (result.needsConfirmation) {
                    UI.showToast(result.message, 'info');
                } else {
                    UI.showToast('Registrierung erfolgreich!', 'success');
                }
            } else {
                UI.showRegisterError(result.error);
            }
        } catch (error) {
            console.error('Register Error:', error);
            UI.showRegisterError('Registrierung fehlgeschlagen');
        } finally {
            UI.setRegisterLoading(false);
        }
    }

    /**
     * Handler für Logout
     */
    async function handleLogout() {
        try {
            const result = await Auth.signOut();
            
            if (result.success) {
                UI.showToast('Erfolgreich abgemeldet', 'success');
                Sync.stopAutoSync();
            } else {
                UI.showToast('Abmeldung fehlgeschlagen', 'error');
            }
        } catch (error) {
            console.error('Logout Error:', error);
            UI.showToast('Abmeldung fehlgeschlagen', 'error');
        }
    }

    /**
     * Handler für manuelle Synchronisation
     */
    async function handleSyncNow() {
        UI.updateSyncStatus('syncing', 'Synchronisiere...');
        
        try {
            const result = await Sync.syncAll();
            
            if (result.success) {
                UI.updateSyncStatus('synced', 'Alles synchronisiert', Sync.getLastSyncFormatted());
                UI.showToast('Synchronisation abgeschlossen', 'success');
                
                // Daten neu laden
                await loadData();
            } else {
                UI.updateSyncStatus('error', 'Sync fehlgeschlagen', Sync.getLastSyncFormatted());
                UI.showToast('Synchronisation fehlgeschlagen', 'error');
            }
        } catch (error) {
            console.error('Sync Error:', error);
            UI.updateSyncStatus('error', 'Sync fehlgeschlagen');
            UI.showToast('Synchronisation fehlgeschlagen', 'error');
        }
    }

    /**
     * Handler für Passwort-Ändern-Formular (direktes Update in Supabase)
     */
    async function handleChangePasswordSubmit(event) {
        event.preventDefault();

        const els = UI.getElements();
        const newPassword = els.inputNewPassword ? els.inputNewPassword.value : '';
        const confirmPassword = els.inputNewPasswordConfirm ? els.inputNewPasswordConfirm.value : '';

        if (els.changePasswordError) {
            els.changePasswordError.textContent = '';
        }

        if (newPassword.length < 6) {
            const msg = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
            if (els.changePasswordError) {
                els.changePasswordError.textContent = msg;
            }
            UI.showToast(msg, 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            const msg = 'Die Passwörter stimmen nicht überein.';
            if (els.changePasswordError) {
                els.changePasswordError.textContent = msg;
            }
            UI.showToast(msg, 'error');
            return;
        }

        if (els.btnSubmitChangePassword) {
            els.btnSubmitChangePassword.disabled = true;
        }

        try {
            const { data, error } = await SupabaseClient.updateUser({ password: newPassword });

            if (error) {
                const msg = error.message || 'Passwort konnte nicht aktualisiert werden.';
                if (els.changePasswordError) {
                    els.changePasswordError.textContent = msg;
                }
                UI.showToast(msg, 'error');
                return;
            }

            UI.showToast('Passwort wurde aktualisiert', 'success');
            UI.hideChangePasswordForm();
        } catch (err) {
            console.error('Change password error:', err);
            UI.showToast('Passwort konnte nicht aktualisiert werden.', 'error');
        } finally {
            if (els.btnSubmitChangePassword) {
                els.btnSubmitChangePassword.disabled = false;
            }
        }
    }

    /**
     * Handler für Auth-Status-Änderungen
     */
    function handleAuthStateChange(event, session, user) {
        // Maßgeblich ist der Auth-Zustand, nicht das einzelne Event
        // (TOKEN_REFRESHED, USER_UPDATED usw. bedeuten weiterhin "angemeldet")
        const wasAuthenticated = isAuthenticated;
        isAuthenticated = Auth.isLoggedIn();

        UI.updateProfileUI(isAuthenticated, user?.email || '');

        if (isAuthenticated && !wasAuthenticated) {
            UI.updateSyncStatus('synced', 'Verbunden', Sync.getLastSyncFormatted());
        }
    }

    /**
     * Handler für Sync-Status-Änderungen
     */
    async function handleSyncStateChange(event) {
        switch (event.type) {
            case 'sync_start':
                UI.updateSyncStatus('syncing', 'Synchronisiere...');
                break;
            case 'sync_complete':
            case 'pull_complete':
            case 'push_complete':
                UI.updateSyncStatus('synced', 'Alles synchronisiert', Sync.getLastSyncFormatted());
                // Nach Sync Daten aus IndexedDB neu laden und UI aktualisieren (z. B. gepullte Unternehmen/Kategorien)
                try {
                    await loadData();
                    refreshViews();
                } catch (e) {
                    console.error('Fehler beim Aktualisieren nach Sync:', e);
                }
                break;
            case 'sync_error':
                UI.updateSyncStatus('error', 'Sync fehlgeschlagen', Sync.getLastSyncFormatted());
                break;
            case 'offline':
                UI.updateSyncStatus('pending', 'Offline');
                break;
        }
    }

    // ========================================
    // Service Worker Registration
    // ========================================

    async function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
            } catch (error) {
                console.warn('Service Worker Registrierung fehlgeschlagen:', error);
            }
        }
    }

    // ========================================
    // Initialization
    // ========================================

    async function init() {
        try {
            // Recovery-Redirect aus URL-Hash erkennen (vor Supabase, damit Session aus Hash übernommen werden kann)
            try {
                const hashParams = new URLSearchParams(location.hash.slice(1));
                const searchParams = new URLSearchParams(location.search.slice(1));
                if (hashParams.get('type') === 'recovery') {
                    pendingRecoveryRedirect = true;
                }
                const err = hashParams.get('error') || searchParams.get('error');
                const errCode = hashParams.get('error_code') || searchParams.get('error_code');
                const errDesc = (hashParams.get('error_description') || searchParams.get('error_description') || '').toLowerCase();
                if (err === 'access_denied' && (errCode === 'otp_expired' || errDesc.includes('expired') || errDesc.includes('invalid'))) {
                    pendingResetLinkError = true;
                }
            } catch (e) {
                // Hash-Parse ignoriert
            }

            // UI initialisieren
            UI.init();

            // Datenbank initialisieren
            await DB.initDB();
            await DB.seedDefaultData();

            // Daten laden
            await loadData();

            // Views initialisieren (Timer lädt dabei seinen gespeicherten Zustand)
            TimerView.init(viewContext);
            EntriesView.init(viewContext);
            AnalysisView.init(viewContext);
            ManagementView.init(viewContext);

            // Events binden
            bindEvents();

            // Service Worker registrieren
            registerServiceWorker();

            // Supabase initialisieren (optional - funktioniert auch ohne)
            SupabaseClient.init();
            
            // Auth initialisieren und Listener registrieren
            await Auth.init();
            Auth.onAuthStateChange(handleAuthStateChange);

            // Nach Recovery-Redirect: Profil anzeigen und Modal „Neues Passwort setzen“ öffnen
            if (pendingRecoveryRedirect && Auth.isLoggedIn()) {
                pendingRecoveryRedirect = false;
                if (typeof history.replaceState === 'function') {
                    history.replaceState(null, '', location.pathname + location.search || '');
                }
                UI.switchView('management');
                ManagementView.openSubpage('profile');
                UI.openResetPasswordModal();
            }

            // Redirect mit Fehler (z. B. Link abgelaufen): URL bereinigen, Profil anzeigen, Hinweis + Modal „Passwort vergessen“
            if (pendingResetLinkError) {
                pendingResetLinkError = false;
                if (typeof history.replaceState === 'function') {
                    history.replaceState(null, '', location.pathname + location.search || '');
                }
                UI.switchView('management');
                ManagementView.openSubpage('profile');
                UI.showToast('Der Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen Link an.', 'info');
                UI.openForgotPasswordModal();
            }

            // Sync-Listener VOR Sync.init() registrieren, damit sync_complete nach dem ersten
            // Login-Sync die UI aktualisiert (sonst kann sync_complete vor der Registrierung feuern).
            Sync.onSyncChange(handleSyncStateChange);
            Sync.init();
        } catch (error) {
            console.error('Initialisierungsfehler:', error);
            UI.showToast('App konnte nicht gestartet werden', 'error');
        }
    }

    // App starten wenn DOM bereit
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Öffentliche API (für Debugging)
    return {
        loadData,
        getCompanies: () => companies,
        getCategories: () => categories
    };
})();
