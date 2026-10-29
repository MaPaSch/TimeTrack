/**
 * TimeTrack PWA - UI Module
 * DOM-Manipulation, Rendering und Event-Handler
 */

const UI = (function() {
    'use strict';

    // DOM Element Cache
    const elements = {};

    /**
     * Initialisiert DOM-Referenzen
     */
    function cacheElements() {
        // Views
        elements.viewTimer = document.getElementById('view-timer');
        elements.viewEntries = document.getElementById('view-entries');
        elements.viewAnalysis = document.getElementById('view-analysis');
        elements.viewManagement = document.getElementById('view-management');
        
        // Navigation
        elements.navItems = document.querySelectorAll('.nav__item');

        // Toast Container
        elements.toastContainer = document.getElementById('toast-container');

        // Profile/Cloud Elements
        elements.profileNavText = document.getElementById('profile-nav-text');
        elements.profileLoggedOut = document.getElementById('profile-logged-out');
        elements.profileLoggedIn = document.getElementById('profile-logged-in');
        elements.profileEmail = document.getElementById('profile-email');
        elements.formLogin = document.getElementById('form-login');
        elements.loginEmail = document.getElementById('login-email');
        elements.loginPassword = document.getElementById('login-password');
        elements.loginError = document.getElementById('login-error');
        elements.btnLogin = document.getElementById('btn-login');
        elements.btnLoginText = document.getElementById('btn-login-text');
        elements.btnLoginLoading = document.getElementById('btn-login-loading');
        elements.btnShowRegister = document.getElementById('btn-show-register');
        elements.btnLogout = document.getElementById('btn-logout');
        elements.btnSyncNow = document.getElementById('btn-sync-now');
        elements.syncStatus = document.getElementById('sync-status');
        elements.syncStatusText = document.getElementById('sync-status-text');
        elements.syncLastTime = document.getElementById('sync-last-time');
        elements.formChangePassword = document.getElementById('form-change-password');
        elements.inputNewPassword = document.getElementById('input-new-password');
        elements.inputNewPasswordConfirm = document.getElementById('input-new-password-confirm');
        elements.changePasswordError = document.getElementById('change-password-error');
        elements.btnSubmitChangePassword = document.getElementById('btn-submit-change-password');
        elements.btnShowChangePassword = document.getElementById('btn-show-change-password');
        elements.profileChangePasswordForm = document.getElementById('profile-change-password-form');
        elements.btnCancelChangePassword = document.getElementById('btn-cancel-change-password');
        
        // Register Modal
        elements.modalRegister = document.getElementById('modal-register');
        elements.formRegister = document.getElementById('form-register');
        elements.registerEmail = document.getElementById('register-email');
        elements.registerPassword = document.getElementById('register-password');
        elements.registerPasswordConfirm = document.getElementById('register-password-confirm');
        elements.registerError = document.getElementById('register-error');
        elements.btnRegister = document.getElementById('btn-register');
        elements.btnRegisterText = document.getElementById('btn-register-text');
        elements.btnRegisterLoading = document.getElementById('btn-register-loading');

        // Forgot Password Modal
        elements.btnForgotPassword = document.getElementById('btn-forgot-password');
        elements.modalForgotPassword = document.getElementById('modal-forgot-password');
        elements.formForgotPassword = document.getElementById('form-forgot-password');
        elements.forgotEmail = document.getElementById('forgot-email');
        elements.forgotError = document.getElementById('forgot-error');
        elements.forgotSuccess = document.getElementById('forgot-success');
        elements.btnForgotSubmit = document.getElementById('btn-forgot-submit');
        elements.btnForgotText = document.getElementById('btn-forgot-text');
        elements.btnForgotLoading = document.getElementById('btn-forgot-loading');

        // Reset Password Modal (Recovery)
        elements.modalResetPassword = document.getElementById('modal-reset-password');
        elements.formResetPassword = document.getElementById('form-reset-password');
        elements.resetPasswordNew = document.getElementById('reset-password-new');
        elements.resetPasswordConfirm = document.getElementById('reset-password-confirm');
        elements.resetPasswordError = document.getElementById('reset-password-error');
        elements.btnResetPasswordSubmit = document.getElementById('btn-reset-password-submit');
        elements.btnResetPasswordText = document.getElementById('btn-reset-password-text');
        elements.btnResetPasswordLoading = document.getElementById('btn-reset-password-loading');
    }

    // ========================================
    // Navigation
    // ========================================

    /**
     * Wechselt die aktive View
     * @param {string} viewName - 'timer', 'analysis', 'management'
     */
    function switchView(viewName) {
        // Views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('view--active');
        });
        document.getElementById(`view-${viewName}`).classList.add('view--active');

        // Navigation
        elements.navItems.forEach(item => {
            const active = item.dataset.nav === viewName;
            item.classList.toggle('nav__item--active', active);
            if (active) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }

    // ========================================
    // Fokus-Falle (Dialoge)
    // ========================================

    const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

    // Aktive Fokus-Fallen; nur die oberste (zuletzt geöffnete) ist wirksam
    const focusTraps = [];

    /**
     * Sichtbare, per Tab erreichbare Elemente eines Containers
     * @param {HTMLElement} container
     * @returns {Array<HTMLElement>}
     */
    function getFocusable(container) {
        return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
            .filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0);
    }

    /**
     * Hält den Tastaturfokus innerhalb eines Dialogs (Tab/Shift+Tab laufen im Kreis)
     * und gibt ihn beim Schließen an das zuvor fokussierte Element zurück
     * @param {HTMLElement} container
     * @returns {Object} { release() }
     */
    function activateFocusTrap(container) {
        const previous = document.activeElement;

        function onKeydown(e) {
            if (e.key !== 'Tab' || focusTraps[focusTraps.length - 1] !== trap) return;
            const items = getFocusable(container);
            if (items.length === 0) {
                e.preventDefault();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            if (!container.contains(document.activeElement)) {
                e.preventDefault();
                first.focus();
            } else if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        const trap = {
            release() {
                document.removeEventListener('keydown', onKeydown, true);
                const index = focusTraps.indexOf(trap);
                if (index >= 0) focusTraps.splice(index, 1);
                if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
                    previous.focus({ preventScroll: true });
                }
            }
        };

        document.addEventListener('keydown', onKeydown, true);
        focusTraps.push(trap);
        return trap;
    }

    // ========================================
    // Modals
    // ========================================

    /**
     * Öffnet ein Modal
     * @param {HTMLElement} modal
     * @param {Object} options - { autofocus: false } verhindert das Fokussieren des ersten Felds
     */
    function openModal(modal, { autofocus = true } = {}) {
        modal.classList.add('modal--open');
        document.body.style.overflow = 'hidden';

        if (!modal.focusTrap) {
            modal.focusTrap = activateFocusTrap(modal);
        }

        // Focus erstes Input-Feld; sonst den Dialog selbst (ohne Tastatur auf Mobilgeräten)
        const firstInput = autofocus && modal.querySelector('input:not([type="hidden"]), select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        } else {
            const content = modal.querySelector('.modal__content') || modal;
            content.setAttribute('tabindex', '-1');
            setTimeout(() => content.focus({ preventScroll: true }), 100);
        }
    }

    /**
     * Schließt ein Modal
     * @param {HTMLElement} modal 
     */
    function closeModal(modal) {
        modal.classList.remove('modal--open');
        document.body.style.overflow = '';

        if (modal.focusTrap) {
            modal.focusTrap.release();
            modal.focusTrap = null;
        }
        
        // Form zurücksetzen
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }

    /**
     * Schließt alle Modals
     */
    function closeAllModals() {
        document.querySelectorAll('.modal--open').forEach(modal => {
            closeModal(modal);
        });
    }

    // ========================================
    // Kategorie-Farben
    // ========================================

    // Palette wie in der Flutter-App (Index = category.colorIndex)
    const CATEGORY_COLORS = [
        '#4a8a6d', // Waldgrün
        '#9aaa6b', // Olivgrün
        '#d4b565', // Senfgelb
        '#d9967f', // Terrakotta
        '#b06b8a', // Altrosa
        '#7a6b9a', // Lavendel
        '#4a8a8a', // Petrol
        '#5a8fb5', // Stahlblau
        '#b5654a', // Rost
        '#c98f4a', // Karamell
        '#6b7a3f', // Moos
        '#6fb3a8', // Mint
        '#8a9ad0', // Periwinkle
        '#8e4a5a', // Bordeaux
        '#8c6a55'  // Kakao
    ];

    // Farbe für "Ohne Kategorie"
    const UNCATEGORIZED_COLOR = '#9ca3af';

    /**
     * Gibt die Farbe einer Kategorie zurück
     * @param {Object|null} category
     * @returns {string}
     */
    function categoryColor(category) {
        if (!category) return UNCATEGORIZED_COLOR;
        const index = Number.isInteger(category.colorIndex) ? category.colorIndex : 0;
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    }

    // ========================================
    // Toast Notifications
    // ========================================

    /**
     * Zeigt eine Toast-Nachricht
     * @param {string} message 
     * @param {string} type - 'success', 'error', 'info'
     * @param {number} duration - ms
     */
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast--hiding');
            setTimeout(() => {
                toast.remove();
            }, 200);
        }, duration);
    }

    // ========================================
    // Theme Management
    // ========================================

    const THEME_KEY = 'timetrack-theme';
    const THEME_MODES = ['system', 'light', 'dark'];
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    /**
     * Gibt den gewählten Modus zurück ('system', 'light' oder 'dark')
     * @returns {string}
     */
    function getThemeMode() {
        const saved = localStorage.getItem(THEME_KEY);
        return THEME_MODES.includes(saved) ? saved : 'system';
    }

    /**
     * Setzt den Modus, speichert ihn und wendet ihn an
     * @param {string} mode - 'system', 'light' oder 'dark'
     */
    function setThemeMode(mode) {
        localStorage.setItem(THEME_KEY, mode);
        applyTheme();
    }

    /**
     * Wendet den gespeicherten Modus an ("system" folgt der Systemeinstellung)
     */
    function applyTheme() {
        const mode = getThemeMode();
        const theme = mode === 'system' ? (darkQuery.matches ? 'dark' : 'light') : mode;
        document.documentElement.setAttribute('data-theme', theme);
        updateMetaThemeColor(theme);
    }

    /**
     * Initialisiert das Theme und reagiert auf Systemwechsel
     */
    function initTheme() {
        applyTheme();
        darkQuery.addEventListener('change', () => {
            if (getThemeMode() === 'system') applyTheme();
        });
    }

    /**
     * Aktualisiert die meta theme-color für die Browser-Leiste
     * @param {string} theme
     */
    function updateMetaThemeColor(theme) {
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute('content', theme === 'dark' ? '#121212' : '#2d5a45');
        }
    }

    // ========================================
    // Profile/Cloud UI
    // ========================================

    /**
     * Zeigt das Passwort-Ändern-Formular an (Button ausblenden, Formular einblenden)
     */
    function showChangePasswordForm() {
        if (elements.btnShowChangePassword) {
            elements.btnShowChangePassword.classList.add('profile-change-password-btn--hidden');
        }
        if (elements.profileChangePasswordForm) {
            elements.profileChangePasswordForm.classList.remove('profile-change-password-form--hidden');
        }
    }

    /**
     * Versteckt das Passwort-Ändern-Formular und zeigt den Button wieder
     */
    function hideChangePasswordForm() {
        if (elements.profileChangePasswordForm) {
            elements.profileChangePasswordForm.classList.add('profile-change-password-form--hidden');
        }
        if (elements.btnShowChangePassword) {
            elements.btnShowChangePassword.classList.remove('profile-change-password-btn--hidden');
        }
        if (elements.inputNewPassword) elements.inputNewPassword.value = '';
        if (elements.inputNewPasswordConfirm) elements.inputNewPasswordConfirm.value = '';
        if (elements.changePasswordError) elements.changePasswordError.textContent = '';
    }

    /**
     * Aktualisiert die Profile-UI basierend auf Auth-Status
     * @param {boolean} isLoggedIn 
     * @param {string} email - Email des Benutzers (wenn angemeldet)
     */
    function updateProfileUI(isLoggedIn, email = '') {
        if (!elements.profileLoggedOut || !elements.profileLoggedIn) return;

        cloudCardState.loggedIn = isLoggedIn;
        cloudCardState.email = email;

        if (isLoggedIn) {
            elements.profileLoggedOut.style.display = 'none';
            elements.profileLoggedIn.style.display = 'block';
            if (elements.profileEmail) {
                elements.profileEmail.textContent = email;
            }
        } else {
            elements.profileLoggedOut.style.display = 'block';
            elements.profileLoggedIn.style.display = 'none';
        }
        updateCloudCardSubtitle();
    }

    // Zustand für den Untertitel der Karte "Cloud & Profil"
    const cloudCardState = { loggedIn: false, email: '', statusText: '' };

    /**
     * Aktualisiert den Untertitel der Karte "Cloud & Profil" in der Verwaltung
     */
    function updateCloudCardSubtitle() {
        if (!elements.profileNavText) return;
        const { loggedIn, email, statusText } = cloudCardState;
        elements.profileNavText.textContent = loggedIn
            ? [email, statusText].filter(Boolean).join(' · ')
            : 'Nicht angemeldet – Daten nur auf diesem Gerät';
    }

    /**
     * Aktualisiert die Sync-Status-Anzeige
     * @param {string} state - 'synced', 'pending', 'syncing', 'error'
     * @param {string} text - Statustext
     * @param {string} lastSync - Letzte Sync-Zeit als Text
     */
    function updateSyncStatus(state, text, lastSync = '') {
        if (!elements.syncStatus) return;

        const dot = elements.syncStatus.querySelector('.profile-sync__dot');
        if (dot) {
            dot.className = 'profile-sync__dot';
            switch (state) {
                case 'synced':
                    dot.classList.add('profile-sync__dot--synced');
                    break;
                case 'pending':
                    dot.classList.add('profile-sync__dot--pending');
                    break;
                case 'syncing':
                    dot.classList.add('profile-sync__dot--syncing');
                    break;
                case 'error':
                    dot.classList.add('profile-sync__dot--error');
                    break;
            }
        }

        if (elements.syncStatusText) {
            elements.syncStatusText.textContent = text;
        }

        cloudCardState.statusText = text;
        updateCloudCardSubtitle();

        if (elements.syncLastTime && lastSync) {
            elements.syncLastTime.textContent = `Letzte Synchronisation: ${lastSync}`;
        }
    }

    /**
     * Zeigt einen Login-Fehler an
     * @param {string} message 
     */
    function showLoginError(message) {
        if (elements.loginError) {
            elements.loginError.textContent = message;
        }
    }

    /**
     * Leert den Login-Fehler
     */
    function clearLoginError() {
        if (elements.loginError) {
            elements.loginError.textContent = '';
        }
    }

    /**
     * Setzt den Login-Button in den Lade-Zustand
     * @param {boolean} loading 
     */
    function setLoginLoading(loading) {
        if (!elements.btnLogin) return;

        elements.btnLogin.disabled = loading;
        
        if (elements.btnLoginText) {
            elements.btnLoginText.style.display = loading ? 'none' : 'inline';
        }
        if (elements.btnLoginLoading) {
            elements.btnLoginLoading.style.display = loading ? 'inline-flex' : 'none';
        }
    }

    /**
     * Zeigt einen Registrierungs-Fehler an
     * @param {string} message 
     */
    function showRegisterError(message) {
        if (elements.registerError) {
            elements.registerError.textContent = message;
        }
    }

    /**
     * Leert den Registrierungs-Fehler
     */
    function clearRegisterError() {
        if (elements.registerError) {
            elements.registerError.textContent = '';
        }
    }

    /**
     * Setzt den Registrieren-Button in den Lade-Zustand
     * @param {boolean} loading 
     */
    function setRegisterLoading(loading) {
        if (!elements.btnRegister) return;

        elements.btnRegister.disabled = loading;
        
        if (elements.btnRegisterText) {
            elements.btnRegisterText.style.display = loading ? 'none' : 'inline';
        }
        if (elements.btnRegisterLoading) {
            elements.btnRegisterLoading.style.display = loading ? 'inline-flex' : 'none';
        }
    }

    /**
     * Öffnet das Registrierungs-Modal
     */
    function openRegisterModal() {
        clearRegisterError();
        if (elements.formRegister) {
            elements.formRegister.reset();
        }
        openModal(elements.modalRegister);
    }

    /**
     * Schließt das Registrierungs-Modal
     */
    function closeRegisterModal() {
        closeModal(elements.modalRegister);
    }

    /**
     * Öffnet das Modal „Passwort zurücksetzen“ (Link anfordern)
     */
    function openForgotPasswordModal() {
        showForgotPasswordError('');
        showForgotPasswordSuccess('');
        if (elements.formForgotPassword) {
            elements.formForgotPassword.reset();
        }
        if (elements.forgotEmail) {
            elements.forgotEmail.value = '';
        }
        openModal(elements.modalForgotPassword);
    }

    /**
     * Zeigt Fehlermeldung im Forgot-Password-Modal
     * @param {string} message
     */
    function showForgotPasswordError(message) {
        if (elements.forgotError) {
            elements.forgotError.textContent = message || '';
            elements.forgotError.style.display = message ? 'block' : 'none';
        }
    }

    /**
     * Zeigt Erfolgsmeldung im Forgot-Password-Modal
     * @param {string} message
     */
    function showForgotPasswordSuccess(message) {
        if (elements.forgotSuccess) {
            elements.forgotSuccess.textContent = message || '';
            elements.forgotSuccess.style.display = message ? 'block' : 'none';
        }
    }

    /**
     * Setzt Loading-Zustand im Forgot-Password-Submit-Button
     * @param {boolean} loading
     */
    function setForgotPasswordLoading(loading) {
        if (elements.btnForgotText && elements.btnForgotLoading) {
            elements.btnForgotText.style.display = loading ? 'none' : 'inline';
            elements.btnForgotLoading.style.display = loading ? 'inline-flex' : 'none';
        }
        if (elements.btnForgotSubmit) {
            elements.btnForgotSubmit.disabled = loading;
        }
    }

    /**
     * Öffnet das Modal „Neues Passwort setzen“ (Recovery)
     */
    function openResetPasswordModal() {
        showResetPasswordError('');
        if (elements.formResetPassword) {
            elements.formResetPassword.reset();
        }
        openModal(elements.modalResetPassword);
    }

    /**
     * Schließt das Modal „Neues Passwort setzen“
     */
    function closeResetPasswordModal() {
        closeModal(elements.modalResetPassword);
    }

    /**
     * Zeigt Fehlermeldung im Reset-Password-Modal
     * @param {string} message
     */
    function showResetPasswordError(message) {
        if (elements.resetPasswordError) {
            elements.resetPasswordError.textContent = message || '';
            elements.resetPasswordError.style.display = message ? 'block' : 'none';
        }
    }

    /**
     * Setzt Loading-Zustand im Reset-Password-Submit-Button
     * @param {boolean} loading
     */
    function setResetPasswordLoading(loading) {
        if (elements.btnResetPasswordText && elements.btnResetPasswordLoading) {
            elements.btnResetPasswordText.style.display = loading ? 'none' : 'inline';
            elements.btnResetPasswordLoading.style.display = loading ? 'inline-flex' : 'none';
        }
        if (elements.btnResetPasswordSubmit) {
            elements.btnResetPasswordSubmit.disabled = loading;
        }
    }

    /**
     * Gibt Element-Referenzen zurück
     * @returns {Object}
     */
    function getElements() {
        return elements;
    }

    /**
     * Initialisiert das UI-Modul
     */
    function init() {
        cacheElements();
        initTheme();
    }

    // Öffentliche API
    return {
        activateFocusTrap,
        init,
        getElements,
        // Navigation
        switchView,
        // Modals
        openModal,
        closeModal,
        closeAllModals,
        // Kategorie-Farben
        CATEGORY_COLORS,
        categoryColor,
        UNCATEGORIZED_COLOR,
        // Toast
        showToast,
        // Theme
        initTheme,
        getThemeMode,
        setThemeMode,
        // Profile/Cloud
        showChangePasswordForm,
        hideChangePasswordForm,
        updateProfileUI,
        updateSyncStatus,
        showLoginError,
        clearLoginError,
        setLoginLoading,
        showRegisterError,
        clearRegisterError,
        setRegisterLoading,
        openRegisterModal,
        closeRegisterModal,
        openForgotPasswordModal,
        showForgotPasswordError,
        showForgotPasswordSuccess,
        setForgotPasswordLoading,
        openResetPasswordModal,
        closeResetPasswordModal,
        showResetPasswordError,
        setResetPasswordLoading
    };
})();

