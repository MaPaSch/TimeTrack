/**
 * TimeTrack PWA - Components
 * Wiederverwendbare UI-Bausteine (an die Flutter-App angelehnt):
 * Icons, Dropdown, Filterleiste + Datumsnavigator, Dialoge, Zeitraum-Picker,
 * Textbaustein-Picker
 */

const Components = (function() {
    'use strict';

    // ========================================
    // Icons (Material Icons, 24x24)
    // ========================================

    const ICON_PATHS = {
        timer: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
        list: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
        barChart: 'M6 20c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2s-2 .9-2 2v7c0 1.1.9 2 2 2zm10-5v3c0 1.1.9 2 2 2s2-.9 2-2v-3c0-1.1-.9-2-2-2s-2 .9-2 2zm-4 5c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2s-2 .9-2 2v12c0 1.1.9 2 2 2z',
        settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
        play: 'M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z',
        stop: 'M8 6h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2z',
        pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
        close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
        check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
        add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
        arrowDown: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
        chevronLeft: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
        chevronRight: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
        edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM5.92 19H5v-.92l9.06-9.06.92.92L5.92 19zM20.71 5.63l-2.34-2.34c-.2-.2-.45-.29-.71-.29s-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41z',
        delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z',
        eventNote: 'M17 10H7v2h10v-2zm2-7h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-5-5H7v2h7v-2z',
        error: 'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z',
        help: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
        playlistAdd: 'M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z',
        upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
        description: 'M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
        tableChart: 'M20 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 2v3H5V5h15zm-5 14h-5v-9h5v9zM5 10h3v9H5v-9zm12 9v-9h3v9h-3z'
    };

    /**
     * Gibt ein Material-Icon als SVG-String zurück
     * @param {string} name - Schlüssel aus ICON_PATHS
     * @param {string} className - Zusätzliche CSS-Klasse
     * @returns {string}
     */
    function icon(name, className = '') {
        return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${ICON_PATHS[name]}"/></svg>`;
    }

    /**
     * Escaped HTML für sichere Ausgabe
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ========================================
    // Overlay-Stack (dynamische Dialoge + offenes Dropdown)
    // ========================================

    const overlayStack = [];
    let activeMenu = null;

    // ESC schließt zuerst ein offenes Dropdown, dann den obersten dynamischen Dialog.
    // Capture-Phase auf window, damit der globale ESC-Handler der App nicht zusätzlich reagiert.
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (activeMenu) {
            e.stopImmediatePropagation();
            activeMenu.close();
            return;
        }
        const top = overlayStack[overlayStack.length - 1];
        if (top) {
            e.stopImmediatePropagation();
            top.dismiss();
        }
    }, true);

    /**
     * Prüft ob ein dynamischer Dialog offen ist
     * @returns {boolean}
     */
    function hasOpenDialog() {
        return overlayStack.length > 0;
    }

    /**
     * Hängt ein dynamisches Modal ein und blendet es ein.
     * @param {HTMLElement} modal - .modal-Element (noch nicht im DOM)
     * @param {Function} resolve - Wird beim Schließen mit dem Ergebnis aufgerufen
     * @param {*} dismissValue - Ergebnis bei Backdrop/ESC
     * @returns {Function} close(value)
     */
    function createOverlay(modal, resolve, dismissValue) {
        let closed = false;
        const entry = { dismiss: () => close(dismissValue) };
        let focusTrap = null;

        function close(value) {
            if (closed) return;
            closed = true;
            const index = overlayStack.indexOf(entry);
            if (index >= 0) overlayStack.splice(index, 1);
            if (focusTrap) focusTrap.release();
            modal.classList.remove('modal--open');
            setTimeout(() => modal.remove(), 300);
            resolve(value);
        }

        function open() {
            document.body.appendChild(modal);
            overlayStack.push(entry);
            focusTrap = UI.activateFocusTrap(modal);
            // Reflow erzwingen, damit die Einblend-Transition greift
            void modal.offsetHeight;
            modal.classList.add('modal--open');
        }

        const backdrop = modal.querySelector('.modal__backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => close(dismissValue));
        }

        return { close, open };
    }

    /**
     * Zeigt ein Bottom Sheet mit Titel und ✕
     * @param {Object} options
     * @param {string} options.title
     * @param {Function} options.body - (close) => HTMLElement
     * @param {string} [options.className] - Zusätzliche Klasse für .modal__content
     * @param {*} [options.dismissValue]
     * @returns {Promise<*>}
     */
    function showSheet({ title, body, className = '', dismissValue = null }) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal modal--sheet modal--stacked';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <div class="modal__backdrop"></div>
                <div class="modal__content sheet ${className}">
                    <div class="sheet__header">
                        <h2 class="sheet__title">${escapeHtml(title)}</h2>
                        <button type="button" class="icon-btn" data-close aria-label="Schließen" title="Schließen">${icon('close')}</button>
                    </div>
                </div>
            `;

            const { close, open } = createOverlay(modal, resolve, dismissValue);
            modal.querySelector('[data-close]').addEventListener('click', () => close(dismissValue));
            modal.querySelector('.modal__content').appendChild(body(close));
            open();
        });
    }

    // ========================================
    // Dialog
    // ========================================

    /**
     * Zeigt einen Dialog (zentriert, Material-AlertDialog-Stil)
     * @param {Object} options
     * @param {string} options.title
     * @param {string} [options.text]
     * @param {Function} [options.body] - (close) => HTMLElement, eigener Inhalt
     * @param {Array} [options.buttons] - [{ label, value, variant: 'primary'|'destructive'|'secondary'|'outlined'|'text', icon? }]
     * @param {boolean} [options.stacked] - Buttons untereinander in voller Breite
     * @param {*} [options.dismissValue] - Rückgabewert bei Backdrop/ESC
     * @param {string} [options.className]
     * @param {string} [options.titleClassName] - z. B. 'dialog__title--danger'
     * @returns {Promise<*>} Wert des gewählten Buttons
     */
    function showDialog({ title, text = '', body = null, buttons = [], stacked = false, dismissValue = null, className = '', titleClassName = '' }) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = `modal modal--confirm dialog ${className}`;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.innerHTML = `
                <div class="modal__backdrop"></div>
                <div class="modal__content modal__content--compact dialog__content">
                    ${title ? `<h2 class="dialog__title ${titleClassName}">${escapeHtml(title)}</h2>` : ''}
                    ${text ? `<p class="dialog__text">${escapeHtml(text)}</p>` : ''}
                    <div class="dialog__body"></div>
                    ${buttons.length ? `<div class="dialog__actions${stacked ? ' dialog__actions--stacked' : ''}"></div>` : ''}
                </div>
            `;

            const { close, open } = createOverlay(modal, resolve, dismissValue);

            if (body) {
                modal.querySelector('.dialog__body').appendChild(body(close));
            }

            const actions = modal.querySelector('.dialog__actions');
            buttons.forEach(btn => {
                const el = document.createElement('button');
                el.type = 'button';
                el.className = `btn btn--${btn.variant || 'primary'}`;
                el.innerHTML = (btn.icon ? icon(btn.icon) : '') + `<span>${escapeHtml(btn.label)}</span>`;
                el.addEventListener('click', () => close(btn.value));
                actions.appendChild(el);
            });

            open();

            // Eigene Formulare (body) fokussieren ihr Feld selbst
            const focusTarget = buttons.length && modal.querySelector('.dialog__actions .btn:last-child');
            if (focusTarget && !stacked) {
                setTimeout(() => focusTarget.focus({ preventScroll: true }), 50);
            }
        });
    }

    /**
     * Bestätigungsdialog ("Abbrechen" + roter Button)
     * @param {Object} options - { title, text, confirmLabel }
     * @returns {Promise<boolean>}
     */
    async function confirm({ title, text, confirmLabel = 'Löschen' }) {
        const result = await showDialog({
            title,
            text,
            buttons: [
                { label: 'Abbrechen', value: false, variant: 'text' },
                { label: confirmLabel, value: true, variant: 'destructive' }
            ],
            dismissValue: false
        });
        return result === true;
    }

    // ========================================
    // Dropdown (Menü öffnet unterhalb des Felds)
    // ========================================

    const MENU_ROW_HEIGHT = 48;
    const MENU_MAX_ROWS = 7.5; // halbe Zeile zeigt an, dass gescrollt werden kann
    const MENU_MIN_WIDTH = 160;

    /**
     * Erstellt ein Dropdown im übergebenen Container
     * @param {HTMLElement} host
     * @param {Object} options
     * @param {string} [options.variant] - 'filter' (grau, ohne Rahmen) oder 'outlined' (Formularfeld)
     * @param {string} [options.placeholder] - Text wenn nichts ausgewählt ist
     * @param {string} [options.ariaLabel]
     * @param {Function} [options.onChange] - (value) => void
     * @returns {Object} { setOptions, setValue, getValue, focus }
     */
    function createDropdown(host, { variant = 'filter', placeholder = '', ariaLabel = '', onChange = null } = {}) {
        host.classList.add('dropdown', `dropdown--${variant}`);
        host.innerHTML = `
            <button type="button" class="dropdown__field" aria-haspopup="listbox" aria-expanded="false"${ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : ''}>
                <span class="dropdown__value"></span>
                ${icon('arrowDown', 'dropdown__icon')}
            </button>
        `;

        const field = host.querySelector('.dropdown__field');
        const valueEl = host.querySelector('.dropdown__value');
        let options = [];
        let value = null;

        function render() {
            const option = options.find(o => o.value === value);
            valueEl.textContent = option ? option.label : placeholder;
            valueEl.classList.toggle('dropdown__value--placeholder', !option);
        }

        function closeMenu() {
            if (activeMenu && activeMenu.owner === host) {
                activeMenu.close();
            }
        }

        function openMenu() {
            if (activeMenu) activeMenu.close();

            const menu = document.createElement('ul');
            menu.className = 'dropdown-menu';
            menu.setAttribute('role', 'listbox');

            options.forEach(option => {
                const item = document.createElement('li');
                item.className = 'dropdown-menu__item';
                if (option.value === value) item.classList.add('dropdown-menu__item--selected');
                if (option.action) item.classList.add('dropdown-menu__item--action');
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', option.value === value ? 'true' : 'false');
                item.tabIndex = -1;
                item.textContent = option.label;
                item.addEventListener('click', () => {
                    close();
                    select(option.value);
                });
                menu.appendChild(item);
            });

            document.body.appendChild(menu);

            // Position: unterhalb des Felds, Feldbreite, 4px Abstand; bei zu wenig Platz oberhalb
            const rect = field.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom - 8;
            const spaceAbove = rect.top - 8;
            const wanted = Math.min(options.length, MENU_MAX_ROWS) * MENU_ROW_HEIGHT + 2;
            const placeAbove = spaceBelow < Math.min(wanted, MENU_ROW_HEIGHT * 3) && spaceAbove > spaceBelow;
            const maxHeight = Math.min(MENU_MAX_ROWS * MENU_ROW_HEIGHT, (placeAbove ? spaceAbove : spaceBelow) - 4);

            // Feldbreite, aber mind. 160px (schmale Filterfelder), innerhalb des Viewports
            const width = Math.min(Math.max(rect.width, MENU_MIN_WIDTH), window.innerWidth - 16);
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
            menu.style.left = `${left}px`;
            menu.style.width = `${width}px`;
            menu.style.maxHeight = `${maxHeight}px`;
            if (placeAbove) {
                menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
            } else {
                menu.style.top = `${rect.bottom + 4}px`;
            }

            const selectedItem = menu.querySelector('.dropdown-menu__item--selected');
            if (selectedItem) {
                menu.scrollTop = selectedItem.offsetTop - (menu.clientHeight - MENU_ROW_HEIGHT) / 2;
            }

            field.setAttribute('aria-expanded', 'true');
            host.classList.add('dropdown--open');

            function onPointerDown(e) {
                if (!menu.contains(e.target) && !field.contains(e.target)) close();
            }
            function onViewportChange(e) {
                if (e && e.target && menu.contains(e.target)) return;
                close();
            }

            function close() {
                if (!menu.isConnected) return;
                menu.remove();
                field.setAttribute('aria-expanded', 'false');
                host.classList.remove('dropdown--open');
                document.removeEventListener('pointerdown', onPointerDown, true);
                window.removeEventListener('resize', onViewportChange);
                document.removeEventListener('scroll', onViewportChange, true);
                if (activeMenu && activeMenu.owner === host) activeMenu = null;
            }

            document.addEventListener('pointerdown', onPointerDown, true);
            window.addEventListener('resize', onViewportChange);
            document.addEventListener('scroll', onViewportChange, true);

            activeMenu = { owner: host, close };
        }

        function select(newValue) {
            const changed = newValue !== value;
            const option = options.find(o => o.value === newValue);
            // Aktions-Optionen (z. B. "+ Neu...") werden nicht als Auswahl übernommen
            if (!option || !option.action) {
                value = newValue;
                render();
            }
            if (onChange && (changed || (option && option.action))) {
                onChange(newValue);
            }
        }

        field.addEventListener('click', () => {
            if (host.classList.contains('dropdown--open')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        return {
            /**
             * @param {Array} newOptions - [{ value, label, action?: boolean }]
             */
            setOptions(newOptions) {
                options = newOptions;
                render();
            },
            setValue(newValue) {
                value = newValue;
                render();
            },
            getValue() {
                return value;
            },
            hasOption(optionValue) {
                return options.some(o => o.value === optionValue && !o.action);
            },
            focus() {
                field.focus();
            }
        };
    }

    // ========================================
    // Datum-Helfer
    // ========================================

    const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                         'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const FIRST_YEAR = 2000;
    const LAST_YEAR = 2100;

    function isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
               a.getMonth() === b.getMonth() &&
               a.getDate() === b.getDate();
    }

    function mondayOf(date) {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        return d;
    }

    /**
     * Verschiebt ein Datum um n Zeiträume
     * @param {string} period - 'day', 'week', 'month', 'year'
     * @param {Date} date
     * @param {number} direction - +1 / -1
     * @returns {Date}
     */
    function shiftDate(period, date, direction) {
        const d = new Date(date);
        switch (period) {
            case 'day':
                d.setDate(d.getDate() + direction);
                break;
            case 'week':
                d.setDate(d.getDate() + direction * 7);
                break;
            case 'month':
                // Auf den 1. setzen, damit z. B. 31. Jan + 1 Monat nicht im März landet
                d.setDate(1);
                d.setMonth(d.getMonth() + direction);
                break;
            case 'year':
                d.setFullYear(d.getFullYear() + direction);
                break;
        }
        return d;
    }

    // ========================================
    // Zeitraum-Picker (Tag/Woche: Kalender, Monat, Jahr)
    // ========================================

    /**
     * Öffnet den passenden Picker für den Zeitraum
     * @param {string} period
     * @param {Date} initial
     * @returns {Promise<Date|null>} null bei Abbruch
     */
    function openPeriodPicker(period, initial) {
        switch (period) {
            case 'month':
                return openMonthPicker(initial);
            case 'year':
                return openYearPicker(initial);
            default:
                return openCalendarPicker(initial, period === 'week');
        }
    }

    /**
     * Kalender-Dialog (wie Material showDatePicker): Auswahl, dann "OK"
     * @param {Date} initial
     * @param {boolean} weekMode - Ganze Woche der Auswahl hervorheben
     * @returns {Promise<Date|null>}
     */
    async function openCalendarPicker(initial, weekMode) {
        let selected = new Date(initial.getFullYear(), initial.getMonth(), initial.getDate());
        let viewYear = selected.getFullYear();
        let viewMonth = selected.getMonth();

        const result = await showDialog({
            title: '',
            className: 'dialog--date',
            dismissValue: null,
            buttons: [
                { label: 'Abbrechen', value: null, variant: 'text' },
                { label: 'OK', value: 'ok', variant: 'text' }
            ],
            body: () => {
                const root = document.createElement('div');
                root.className = 'date-dialog';
                root.innerHTML = `
                    <div class="date-dialog__header">
                        <span class="date-dialog__help">Datum auswählen</span>
                        <span class="date-dialog__selected"></span>
                    </div>
                    <div class="date-dialog__nav">
                        <span class="date-dialog__month"></span>
                        <button type="button" class="icon-btn" data-nav="-1" aria-label="Vorheriger Monat">${icon('chevronLeft')}</button>
                        <button type="button" class="icon-btn" data-nav="1" aria-label="Nächster Monat">${icon('chevronRight')}</button>
                    </div>
                    <div class="date-dialog__weekdays">
                        <span>M</span><span>D</span><span>M</span><span>D</span><span>F</span><span>S</span><span>S</span>
                    </div>
                    <div class="date-dialog__days"></div>
                `;

                const selectedEl = root.querySelector('.date-dialog__selected');
                const monthEl = root.querySelector('.date-dialog__month');
                const daysEl = root.querySelector('.date-dialog__days');

                function render() {
                    selectedEl.textContent = selected.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
                    monthEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

                    const first = new Date(viewYear, viewMonth, 1);
                    const offset = (first.getDay() + 6) % 7;
                    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
                    const today = new Date();
                    const selectedMonday = mondayOf(selected);

                    let html = '';
                    for (let i = 0; i < offset; i++) {
                        html += '<span class="date-dialog__day date-dialog__day--empty"></span>';
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(viewYear, viewMonth, day);
                        const classes = ['date-dialog__day'];
                        if (isSameDay(date, today)) classes.push('date-dialog__day--today');
                        if (weekMode) {
                            if (mondayOf(date).getTime() === selectedMonday.getTime()) {
                                classes.push('date-dialog__day--in-week');
                                const weekday = (date.getDay() + 6) % 7;
                                if (weekday === 0 || day === 1) classes.push('date-dialog__day--week-start');
                                if (weekday === 6 || day === daysInMonth) classes.push('date-dialog__day--week-end');
                            }
                        } else if (isSameDay(date, selected)) {
                            classes.push('date-dialog__day--selected');
                        }
                        html += `<button type="button" class="${classes.join(' ')}" data-day="${day}">${day}</button>`;
                    }
                    daysEl.innerHTML = html;

                    root.querySelector('[data-nav="-1"]').disabled = viewYear === FIRST_YEAR && viewMonth === 0;
                    root.querySelector('[data-nav="1"]').disabled = viewYear === LAST_YEAR && viewMonth === 11;
                }

                root.addEventListener('click', (e) => {
                    const navBtn = e.target.closest('[data-nav]');
                    if (navBtn) {
                        const d = new Date(viewYear, viewMonth + Number(navBtn.dataset.nav), 1);
                        viewYear = d.getFullYear();
                        viewMonth = d.getMonth();
                        render();
                        return;
                    }
                    const dayBtn = e.target.closest('[data-day]');
                    if (dayBtn) {
                        selected = new Date(viewYear, viewMonth, Number(dayBtn.dataset.day));
                        render();
                    }
                });

                render();
                return root;
            }
        });

        return result === 'ok' ? selected : null;
    }

    /**
     * Dialog "Monat wählen": Jahreswechsler + 12 Monats-Chips
     * @param {Date} initial
     * @returns {Promise<Date|null>}
     */
    function openMonthPicker(initial) {
        let year = initial.getFullYear();

        return showDialog({
            title: 'Monat wählen',
            dismissValue: null,
            body: (close) => {
                const root = document.createElement('div');
                root.className = 'month-dialog';
                root.innerHTML = `
                    <div class="month-dialog__years">
                        <button type="button" class="icon-btn" data-year="-1" aria-label="Zurück">${icon('chevronLeft')}</button>
                        <span class="month-dialog__year"></span>
                        <button type="button" class="icon-btn" data-year="1" aria-label="Vor">${icon('chevronRight')}</button>
                    </div>
                    <div class="month-dialog__chips"></div>
                `;
                const yearEl = root.querySelector('.month-dialog__year');
                const chipsEl = root.querySelector('.month-dialog__chips');

                function render() {
                    yearEl.textContent = year;
                    chipsEl.innerHTML = MONTH_NAMES.map((name, month) => {
                        const selected = year === initial.getFullYear() && month === initial.getMonth();
                        return `<button type="button" class="chip${selected ? ' chip--selected' : ''}" data-month="${month}">${selected ? icon('check', 'chip__check') : ''}${name.substring(0, 3)}</button>`;
                    }).join('');
                }

                root.addEventListener('click', (e) => {
                    const yearBtn = e.target.closest('[data-year]');
                    if (yearBtn) {
                        year += Number(yearBtn.dataset.year);
                        render();
                        return;
                    }
                    const chip = e.target.closest('[data-month]');
                    if (chip) {
                        close(new Date(year, Number(chip.dataset.month), 1));
                    }
                });

                render();
                return root;
            }
        });
    }

    /**
     * Dialog "Jahr wählen": scrollbares Jahresraster (2000–2100)
     * @param {Date} initial
     * @returns {Promise<Date|null>}
     */
    function openYearPicker(initial) {
        return showDialog({
            title: 'Jahr wählen',
            dismissValue: null,
            body: (close) => {
                const root = document.createElement('div');
                root.className = 'year-dialog';
                let html = '';
                for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
                    const selected = year === initial.getFullYear();
                    html += `<button type="button" class="year-dialog__year${selected ? ' year-dialog__year--selected' : ''}" data-year="${year}">${year}</button>`;
                }
                root.innerHTML = html;

                root.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-year]');
                    if (btn) close(new Date(Number(btn.dataset.year), 0, 1));
                });

                // Ausgewähltes Jahr in die Mitte scrollen, sobald der Dialog im DOM ist
                requestAnimationFrame(() => {
                    const selected = root.querySelector('.year-dialog__year--selected');
                    if (selected) {
                        root.scrollTop = selected.offsetTop - root.clientHeight / 2 + selected.offsetHeight / 2;
                    }
                });
                return root;
            }
        });
    }

    // ========================================
    // Filterleiste + Datumsnavigator (Einträge & Auswertung)
    // ========================================

    const PERIOD_OPTIONS = [
        { value: 'day', label: 'Tag' },
        { value: 'week', label: 'Woche' },
        { value: 'month', label: 'Monat' },
        { value: 'year', label: 'Jahr' }
    ];

    // Filterwert für Einträge ohne (oder mit gelöschter) Kategorie
    const NO_CATEGORY = '__none__';

    /**
     * Erstellt Filterleiste (Zeitraum / Unternehmen / Kategorie) und Datumsnavigator.
     * Jede Ansicht hat ihren eigenen, unabhängigen Zustand.
     * @param {Object} options
     * @param {HTMLElement} options.filterHost - Container für die Filterleiste
     * @param {HTMLElement} options.navigatorHost - Container für den Datumsnavigator
     * @param {Function} options.onChange - Wird bei jeder Änderung aufgerufen
     * @returns {Object}
     */
    function createPeriodFilter({ filterHost, navigatorHost, onChange }) {
        const state = {
            period: 'month',
            date: new Date(),
            companyId: 'all',
            categoryId: 'all'
        };

        filterHost.classList.add('filter-bar');
        filterHost.innerHTML = `
            <div class="filter-bar__group">
                <span class="filter-bar__label">Zeitraum</span>
                <div data-filter="period"></div>
            </div>
            <div class="filter-bar__group">
                <span class="filter-bar__label">Unternehmen</span>
                <div data-filter="company"></div>
            </div>
            <div class="filter-bar__group">
                <span class="filter-bar__label">Kategorie</span>
                <div data-filter="category"></div>
            </div>
        `;

        const periodDropdown = createDropdown(filterHost.querySelector('[data-filter="period"]'), {
            ariaLabel: 'Zeitraum',
            onChange: (value) => {
                state.period = value;
                // Wie in der App: Periodenwechsel springt auf heute
                state.date = new Date();
                changed();
            }
        });
        periodDropdown.setOptions(PERIOD_OPTIONS);
        periodDropdown.setValue(state.period);

        const companyDropdown = createDropdown(filterHost.querySelector('[data-filter="company"]'), {
            ariaLabel: 'Unternehmen',
            onChange: (value) => {
                state.companyId = value;
                changed();
            }
        });

        const categoryDropdown = createDropdown(filterHost.querySelector('[data-filter="category"]'), {
            ariaLabel: 'Kategorie',
            onChange: (value) => {
                state.categoryId = value;
                changed();
            }
        });

        navigatorHost.classList.add('date-navigator');
        navigatorHost.innerHTML = `
            <button type="button" class="date-navigator__btn" data-step="-1" aria-label="Zurück" title="Zurück">${icon('chevronLeft', 'date-navigator__icon')}</button>
            <button type="button" class="date-navigator__display">
                <span class="date-navigator__text"></span>
                ${icon('arrowDown', 'date-navigator__dropdown-icon')}
            </button>
            <button type="button" class="date-navigator__btn" data-step="1" aria-label="Vor" title="Vor">${icon('chevronRight', 'date-navigator__icon')}</button>
        `;
        const labelEl = navigatorHost.querySelector('.date-navigator__text');

        navigatorHost.querySelectorAll('[data-step]').forEach(btn => {
            btn.addEventListener('click', () => {
                state.date = shiftDate(state.period, state.date, Number(btn.dataset.step));
                changed();
            });
        });

        navigatorHost.querySelector('.date-navigator__display').addEventListener('click', async () => {
            const picked = await openPeriodPicker(state.period, state.date);
            if (picked) {
                state.date = picked;
                changed();
            }
        });

        function updateLabel() {
            labelEl.textContent = Utils.formatNavigatorDate(state.period, state.date);
        }

        function changed() {
            updateLabel();
            onChange();
        }

        updateLabel();

        return {
            /**
             * Aktualisiert die Auswahllisten; ungültige Auswahl fällt auf "Alle" zurück
             */
            setLists(companies, categories) {
                companyDropdown.setOptions([
                    { value: 'all', label: 'Alle' },
                    ...companies.map(c => ({ value: c.id, label: c.name }))
                ]);
                if (!companyDropdown.hasOption(state.companyId)) state.companyId = 'all';
                companyDropdown.setValue(state.companyId);

                categoryDropdown.setOptions([
                    { value: 'all', label: 'Alle' },
                    ...categories.map(c => ({ value: c.id, label: c.name })),
                    { value: NO_CATEGORY, label: 'Ohne Kategorie' }
                ]);
                if (!categoryDropdown.hasOption(state.categoryId)) state.categoryId = 'all';
                categoryDropdown.setValue(state.categoryId);
            },
            getState() {
                return { ...state };
            },
            getDateRange() {
                return Utils.getDateRangeForNavigator(state.period, state.date);
            },
            setDate(date) {
                state.date = new Date(date);
                updateLabel();
            },
            /**
             * Wendet den Kategorie-Filter an. "Ohne Kategorie" umfasst auch
             * Einträge, deren Kategorie gelöscht wurde.
             */
            filterByCategory(entries, categories) {
                if (state.categoryId === 'all') return entries;
                if (state.categoryId === NO_CATEGORY) {
                    const known = new Set(categories.map(c => c.id));
                    return entries.filter(e => !e.categoryId || !known.has(e.categoryId));
                }
                return entries.filter(e => e.categoryId === state.categoryId);
            }
        };
    }

    // ========================================
    // Leerzustand
    // ========================================

    /**
     * HTML für einen Leer-/Fehlerzustand (Icon + Text)
     * @param {string} iconName
     * @param {string} text
     * @returns {string}
     */
    function emptyState(iconName, text) {
        return `
            <div class="empty-state">
                ${icon(iconName, 'empty-state__icon')}
                <p class="empty-state__text">${escapeHtml(text)}</p>
            </div>
        `;
    }

    // ========================================
    // Notizfeld mit Textbausteinen
    // ========================================

    /**
     * Fügt einen Textbaustein in einen Text ein (wie text_insert.dart):
     * Mit Cursor an der Cursorposition (ersetzt Auswahl), mit Leerzeichen
     * nur wenn der Baustein sonst an einem Wort klebt. Ohne Cursor wird er
     * angehängt, bei nicht-leerem Text in einer neuen Zeile.
     * @returns {Object} { text, cursor }
     */
    function insertSnippetText(text, selectionStart, selectionEnd, snippet, hasCursor) {
        const isSpace = (char) => !char || char.trim() === '';

        if (hasCursor) {
            const before = text.substring(0, selectionStart);
            const after = text.substring(selectionEnd);
            const leading = before && snippet && !isSpace(before[before.length - 1]) && !isSpace(snippet[0]) ? ' ' : '';
            const trailing = after && snippet && !isSpace(after[0]) && !isSpace(snippet[snippet.length - 1]) ? ' ' : '';
            return {
                text: before + leading + snippet + trailing + after,
                cursor: before.length + leading.length + snippet.length
            };
        }

        const separator = text === '' || text.endsWith('\n') ? '' : '\n';
        const result = text + separator + snippet;
        return { text: result, cursor: result.length };
    }

    /**
     * Ergänzt ein Textarea um den Button "Textbaustein einfügen"
     * @param {HTMLTextAreaElement} textarea
     * @returns {Object} { reset } - reset() vergisst die Cursorposition (beim Öffnen des Formulars)
     */
    function attachSnippetButton(textarea) {
        const wrapper = document.createElement('div');
        wrapper.className = 'note-field';
        textarea.parentNode.insertBefore(wrapper, textarea);
        wrapper.appendChild(textarea);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-btn note-field__btn';
        button.setAttribute('aria-label', 'Textbaustein einfügen');
        button.title = 'Textbaustein einfügen';
        button.innerHTML = icon('playlistAdd');
        wrapper.appendChild(button);

        // Hat der Nutzer das Feld schon fokussiert, gilt dessen Cursorposition
        let hasCursor = false;
        textarea.addEventListener('focus', () => { hasCursor = true; });

        button.addEventListener('click', async () => {
            const snippet = await openSnippetPicker();
            if (snippet === null) return;

            const result = insertSnippetText(
                textarea.value,
                textarea.selectionStart,
                textarea.selectionEnd,
                snippet,
                hasCursor
            );
            textarea.value = result.text;
            textarea.focus();
            textarea.setSelectionRange(result.cursor, result.cursor);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });

        return {
            reset() {
                hasCursor = false;
            }
        };
    }

    /**
     * Sheet "Textbaustein einfügen"
     * @returns {Promise<string|null>} Inhalt des gewählten Bausteins oder null
     */
    async function openSnippetPicker() {
        let snippets = [];
        try {
            snippets = await DB.getTextSnippets();
        } catch (error) {
            console.error('Fehler beim Laden der Textbausteine:', error);
        }

        return showSheet({
            title: 'Textbaustein einfügen',
            className: 'sheet--snippets',
            body: (close) => {
                const root = document.createElement('div');
                root.className = 'sheet__scroll';
                root.innerHTML = snippets.length
                    ? `<ul class="snippet-list">${snippets.map(s => `<li><button type="button" class="snippet-list__item" data-id="${s.id}">${escapeHtml(s.content)}</button></li>`).join('')}</ul>`
                    : `<div class="snippet-empty">
                            <p class="snippet-empty__title">Keine Textbausteine vorhanden</p>
                            <p class="snippet-empty__hint">Textbausteine können unter Verwaltung angelegt werden.</p>
                       </div>`;

                root.addEventListener('click', (e) => {
                    const item = e.target.closest('.snippet-list__item');
                    if (item) {
                        const snippet = snippets.find(s => s.id === item.dataset.id);
                        close(snippet ? snippet.content : null);
                    }
                });
                return root;
            }
        });
    }

    // ========================================
    // Tastatur-Inset für Bottom Sheets (iOS)
    // ========================================

    /**
     * Hält --keyboard-inset aktuell, damit Bottom Sheets über der Bildschirmtastatur bleiben
     */
    function initKeyboardInset() {
        const vv = window.visualViewport;
        if (!vv) return;
        const update = () => {
            const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
        };
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        update();
    }

    initKeyboardInset();

    // Öffentliche API
    return {
        icon,
        escapeHtml,
        hasOpenDialog,
        showDialog,
        showSheet,
        confirm,
        createDropdown,
        createPeriodFilter,
        openPeriodPicker,
        emptyState,
        attachSnippetButton,
        insertSnippetText,
        openSnippetPicker,
        NO_CATEGORY
    };
})();
