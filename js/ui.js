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
        
        // Timer Elements
        elements.timerHours = document.getElementById('timer-hours');
        elements.timerMinutes = document.getElementById('timer-minutes');
        elements.timerSeconds = document.getElementById('timer-seconds');
        elements.timerStatus = document.getElementById('timer-status');
        elements.btnTimerMain = document.getElementById('btn-timer-main');
        elements.btnTimerSecondary = document.getElementById('btn-timer-secondary');
        elements.btnTimerMainText = document.getElementById('btn-timer-main-text');
        elements.btnTimerSecondaryText = document.getElementById('btn-timer-secondary-text');
        elements.iconPlay = document.getElementById('icon-play');
        elements.iconStop = document.getElementById('icon-stop');
        elements.iconSecondaryPause = document.getElementById('icon-secondary-pause');
        elements.iconSecondaryStop = document.getElementById('icon-secondary-stop');
        
        // Navigation
        elements.navItems = document.querySelectorAll('.nav__item');
        
        // Filter Elements (Analysis View)
        elements.filterPeriod = document.getElementById('filter-period');
        elements.filterCompany = document.getElementById('filter-company');
        elements.filterCategory = document.getElementById('filter-category');
        
        // Filter Elements (Entries View)
        elements.entriesFilterPeriod = document.getElementById('entries-filter-period');
        elements.entriesFilterCompany = document.getElementById('entries-filter-company');
        elements.entriesFilterCategory = document.getElementById('entries-filter-category');
        
        // Category Chart Elements
        elements.categoryChart = document.getElementById('category-chart');
        elements.chartPie = document.getElementById('chart-pie');
        
        // Category Bars (neue Auswertung)
        elements.categoryBars = document.getElementById('category-bars');
        
        // Date Navigator (Analysis)
        elements.dateNavigator = document.getElementById('date-navigator');
        elements.dateNavigatorText = document.getElementById('date-navigator-text');
        elements.dateNavigatorDisplay = document.getElementById('date-navigator-display');
        elements.btnDatePrev = document.getElementById('btn-date-prev');
        elements.btnDateNext = document.getElementById('btn-date-next');
        
        // Date Picker (Analysis)
        elements.datePicker = document.getElementById('date-picker');
        elements.datePickerBackdrop = document.getElementById('date-picker-backdrop');
        elements.datePickerCalendar = document.getElementById('date-picker-calendar');
        elements.datePickerMonths = document.getElementById('date-picker-months');
        elements.datePickerYears = document.getElementById('date-picker-years');
        elements.pickerCalendarTitle = document.getElementById('picker-calendar-title');
        elements.pickerDays = document.getElementById('picker-days');
        elements.btnPickerPrev = document.getElementById('btn-picker-prev');
        elements.btnPickerNext = document.getElementById('btn-picker-next');
        elements.pickerMonthsTitle = document.getElementById('picker-months-title');
        elements.pickerMonthGrid = document.getElementById('picker-month-grid');
        elements.btnMonthPickerPrev = document.getElementById('btn-month-picker-prev');
        elements.btnMonthPickerNext = document.getElementById('btn-month-picker-next');
        elements.pickerYearList = document.getElementById('picker-year-list');
        
        // Date Navigator (Entries)
        elements.entriesDateNavigator = document.getElementById('entries-date-navigator');
        elements.entriesDateNavigatorText = document.getElementById('entries-date-navigator-text');
        elements.entriesDateNavigatorDisplay = document.getElementById('entries-date-navigator-display');
        elements.btnEntriesDatePrev = document.getElementById('btn-entries-date-prev');
        elements.btnEntriesDateNext = document.getElementById('btn-entries-date-next');
        
        // Date Picker (Entries)
        elements.entriesDatePicker = document.getElementById('entries-date-picker');
        elements.entriesDatePickerBackdrop = document.getElementById('entries-date-picker-backdrop');
        elements.entriesDatePickerCalendar = document.getElementById('entries-date-picker-calendar');
        elements.entriesDatePickerMonths = document.getElementById('entries-date-picker-months');
        elements.entriesDatePickerYears = document.getElementById('entries-date-picker-years');
        elements.entriesPickerCalendarTitle = document.getElementById('entries-picker-calendar-title');
        elements.entriesPickerDays = document.getElementById('entries-picker-days');
        elements.btnEntriesPickerPrev = document.getElementById('btn-entries-picker-prev');
        elements.btnEntriesPickerNext = document.getElementById('btn-entries-picker-next');
        elements.entriesPickerMonthsTitle = document.getElementById('entries-picker-months-title');
        elements.entriesPickerMonthGrid = document.getElementById('entries-picker-month-grid');
        elements.btnEntriesMonthPickerPrev = document.getElementById('btn-entries-month-picker-prev');
        elements.btnEntriesMonthPickerNext = document.getElementById('btn-entries-month-picker-next');
        elements.entriesPickerYearList = document.getElementById('entries-picker-year-list');
        
        // Lists
        elements.entriesList = document.getElementById('entries-list');
        elements.entriesEmpty = document.getElementById('entries-empty');
        elements.companiesList = document.getElementById('companies-list');
        elements.categoriesList = document.getElementById('categories-list');
        elements.categoriesEmpty = document.getElementById('categories-empty');
        
        // Buttons
        elements.btnAddCompany = document.getElementById('btn-add-company');
        elements.btnAddCategory = document.getElementById('btn-add-category');
        elements.btnConfirmDelete = document.getElementById('btn-confirm-delete');
        
        // Management Buttons
        elements.btnToggleTheme = document.getElementById('btn-toggle-theme');
        elements.btnOpenStammdaten = document.getElementById('btn-open-stammdaten');
        elements.btnImport = document.getElementById('btn-import');
        elements.btnExport = document.getElementById('btn-export');
        elements.btnDeleteAll = document.getElementById('btn-delete-all');
        
        // Management Subpage
        elements.viewManagementData = document.getElementById('view-management-data');
        elements.btnBackManagement = document.getElementById('btn-back-management');
        elements.companiesEmpty = document.getElementById('companies-empty');
        
        // Modals
        elements.modalSaveEntry = document.getElementById('modal-save-entry');
        elements.modalEditEntry = document.getElementById('modal-edit-entry');
        elements.modalAddCompany = document.getElementById('modal-add-company');
        elements.modalAddCategory = document.getElementById('modal-add-category');
        elements.modalConfirmDelete = document.getElementById('modal-confirm-delete');
        elements.modalDiscardConfirm = document.getElementById('modal-discard-confirm');
        elements.modalExportFormat = document.getElementById('modal-export-format');
        elements.modalDeleteAll = document.getElementById('modal-delete-all');
        elements.modalInitialCompany = document.getElementById('modal-initial-company');
        
        // Initial Company Modal
        elements.formInitialCompany = document.getElementById('form-initial-company');
        elements.initialCompanyName = document.getElementById('initial-company-name');
        elements.btnSaveInitialCompany = document.getElementById('btn-save-initial-company');
        
        // Export Modal Buttons
        elements.btnExportAsJson = document.getElementById('btn-export-as-json');
        elements.btnExportAsCsv = document.getElementById('btn-export-as-csv');
        
        // Delete All Modal
        elements.deleteConfirmationInput = document.getElementById('delete-confirmation-input');
        elements.btnConfirmDeleteAll = document.getElementById('btn-confirm-delete-all');
        
        // Discard Confirmation Buttons
        elements.btnConfirmSave = document.getElementById('btn-confirm-save');
        elements.btnConfirmDiscard = document.getElementById('btn-confirm-discard');
        elements.btnConfirmCancel = document.getElementById('btn-confirm-cancel');
        
        // Save Entry Button
        elements.btnSaveEntry = document.getElementById('btn-save-entry');
        
        // Inline Add Category
        elements.inlineAddCategory = document.getElementById('inline-add-category');
        elements.inlineCategoryName = document.getElementById('inline-category-name');
        elements.btnInlineAddCategory = document.getElementById('btn-inline-add-category');
        elements.btnInlineCancelCategory = document.getElementById('btn-inline-cancel-category');
        
        // Forms
        elements.formSaveEntry = document.getElementById('form-save-entry');
        elements.formEditEntry = document.getElementById('form-edit-entry');
        elements.formAddCompany = document.getElementById('form-add-company');
        elements.formAddCategory = document.getElementById('form-add-category');
        
        // Form Fields - Save Entry
        elements.entryDuration = document.getElementById('entry-duration');
        elements.entryCompany = document.getElementById('entry-company');
        elements.entryCategory = document.getElementById('entry-category');
        elements.entryNote = document.getElementById('entry-note');
        
        // Form Fields - Edit Entry
        elements.editEntryId = document.getElementById('edit-entry-id');
        elements.editDate = document.getElementById('edit-date');
        elements.editDateBtn = document.getElementById('edit-date-btn');
        elements.editDateDisplay = document.getElementById('edit-date-display');
        elements.editDatePicker = document.getElementById('edit-date-picker');
        elements.editPickerTitle = document.getElementById('edit-picker-title');
        elements.editPickerDays = document.getElementById('edit-picker-days');
        elements.btnEditPickerPrev = document.getElementById('btn-edit-picker-prev');
        elements.btnEditPickerNext = document.getElementById('btn-edit-picker-next');
        elements.editStart = document.getElementById('edit-start');
        elements.editEnd = document.getElementById('edit-end');
        elements.editCompany = document.getElementById('edit-company');
        elements.editCategory = document.getElementById('edit-category');
        elements.editNote = document.getElementById('edit-note');
        
        // Form Fields - Add Company/Category
        elements.companyName = document.getElementById('company-name');
        elements.categoryName = document.getElementById('category-name');
        
        // Delete Confirm
        elements.deleteMessage = document.getElementById('delete-message');
        elements.deleteItemId = document.getElementById('delete-item-id');
        elements.deleteItemType = document.getElementById('delete-item-type');
        
        // Toast Container
        elements.toastContainer = document.getElementById('toast-container');
        
        // File Import Input
        elements.fileImportInput = document.getElementById('file-import-input');
    }

    // ========================================
    // Timer Display
    // ========================================

    /**
     * Aktualisiert die Timer-Anzeige
     * @param {number} elapsed - Verstrichene Zeit in ms
     */
    function updateTimerDisplay(elapsed) {
        const time = Utils.formatTime(elapsed);
        elements.timerHours.textContent = time.hours;
        elements.timerMinutes.textContent = time.minutes;
        elements.timerSeconds.textContent = time.seconds;
    }

    /**
     * Aktualisiert den Timer-Zustand (Button, Status, etc.)
     * @param {boolean} isRunning 
     * @param {boolean} isPaused 
     */
    function updateTimerState(isRunning, isPaused) {
        const timerContainer = elements.viewTimer.querySelector('.timer');
        const timerDisplay = elements.viewTimer.querySelector('.timer__display');
        
        if (isRunning) {
            // Timer läuft: Main=Stop (rot), Secondary=Pause
            timerContainer.classList.add('timer--running');
            timerContainer.classList.remove('timer--paused');
            timerDisplay.classList.remove('timer__display--hidden');
            
            // Main Button: Stop
            elements.btnTimerMainText.textContent = 'Stop';
            elements.iconPlay.classList.add('btn__icon--hidden');
            elements.iconStop.classList.remove('btn__icon--hidden');
            elements.btnTimerMain.classList.remove('btn--primary');
            elements.btnTimerMain.classList.add('btn--destructive');
            elements.btnTimerMain.setAttribute('aria-label', 'Timer stoppen');
            
            // Secondary Button: Pause (sichtbar)
            elements.btnTimerSecondary.classList.remove('timer__button--hidden');
            elements.btnTimerSecondaryText.textContent = 'Pause';
            elements.iconSecondaryPause.classList.remove('btn__icon--hidden');
            elements.iconSecondaryStop.classList.add('btn__icon--hidden');
            elements.btnTimerSecondary.setAttribute('aria-label', 'Timer pausieren');
            
            elements.timerStatus.textContent = 'Timer läuft...';
        } else if (isPaused) {
            // Timer pausiert: Main=Fortsetzen (grün), Secondary=Stop
            timerContainer.classList.remove('timer--running');
            timerContainer.classList.add('timer--paused');
            timerDisplay.classList.remove('timer__display--hidden');
            
            // Main Button: Fortsetzen
            elements.btnTimerMainText.textContent = 'Fortsetzen';
            elements.iconPlay.classList.remove('btn__icon--hidden');
            elements.iconStop.classList.add('btn__icon--hidden');
            elements.btnTimerMain.classList.add('btn--primary');
            elements.btnTimerMain.classList.remove('btn--destructive');
            elements.btnTimerMain.setAttribute('aria-label', 'Timer fortsetzen');
            
            // Secondary Button: Stop (sichtbar)
            elements.btnTimerSecondary.classList.remove('timer__button--hidden');
            elements.btnTimerSecondaryText.textContent = 'Stop';
            elements.iconSecondaryPause.classList.add('btn__icon--hidden');
            elements.iconSecondaryStop.classList.remove('btn__icon--hidden');
            elements.btnTimerSecondary.setAttribute('aria-label', 'Timer stoppen');
            
            elements.timerStatus.textContent = 'Timer pausiert';
        } else {
            // Timer gestoppt: Main=Start (grün), Secondary=versteckt
            timerContainer.classList.remove('timer--running');
            timerContainer.classList.remove('timer--paused');
            
            // Main Button: Start
            elements.btnTimerMainText.textContent = 'Start';
            elements.iconPlay.classList.remove('btn__icon--hidden');
            elements.iconStop.classList.add('btn__icon--hidden');
            elements.btnTimerMain.classList.add('btn--primary');
            elements.btnTimerMain.classList.remove('btn--destructive');
            elements.btnTimerMain.setAttribute('aria-label', 'Timer starten');
            
            // Secondary Button: versteckt
            elements.btnTimerSecondary.classList.add('timer__button--hidden');
            
            elements.timerStatus.textContent = 'Bereit zum Starten';
        }
    }

    /**
     * Blendet die Timer-Anzeige aus (nach Speichern/Verwerfen)
     */
    function hideTimerDisplay() {
        const timerDisplay = elements.viewTimer.querySelector('.timer__display');
        timerDisplay.classList.add('timer__display--hidden');
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
            item.classList.remove('nav__item--active');
            if (item.dataset.nav === viewName) {
                item.classList.add('nav__item--active');
            }
        });
    }

    // ========================================
    // Modals
    // ========================================

    /**
     * Öffnet ein Modal
     * @param {HTMLElement} modal 
     */
    function openModal(modal) {
        modal.classList.add('modal--open');
        document.body.style.overflow = 'hidden';
        
        // Focus erstes Input-Feld
        const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    /**
     * Schließt ein Modal
     * @param {HTMLElement} modal 
     */
    function closeModal(modal) {
        modal.classList.remove('modal--open');
        document.body.style.overflow = '';
        
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

    /**
     * Öffnet den Discard-Confirmation Dialog
     */
    function openDiscardConfirmation() {
        openModal(elements.modalDiscardConfirm);
    }

    /**
     * Schließt den Discard-Confirmation Dialog
     */
    function closeDiscardConfirmation() {
        closeModal(elements.modalDiscardConfirm);
    }

    /**
     * Prüft ob das Save-Entry Modal offen ist
     * @returns {boolean}
     */
    function isSaveEntryModalOpen() {
        return elements.modalSaveEntry.classList.contains('modal--open');
    }

    /**
     * Prüft ob der Discard-Confirmation Dialog offen ist
     * @returns {boolean}
     */
    function isDiscardConfirmationOpen() {
        return elements.modalDiscardConfirm.classList.contains('modal--open');
    }

    /**
     * Öffnet das Initial Company Modal (beim ersten App-Start)
     */
    function openInitialCompanyModal() {
        openModal(elements.modalInitialCompany);
    }

    /**
     * Schließt das Initial Company Modal
     */
    function closeInitialCompanyModal() {
        closeModal(elements.modalInitialCompany);
    }

    /**
     * Validiert ob Save-Entry Formular komplett ausgefüllt ist
     * @returns {boolean}
     */
    function validateSaveEntryForm() {
        const companyId = elements.entryCompany.value;
        return companyId !== '';
    }

    /**
     * Aktualisiert den Speichern-Button Status basierend auf Validierung
     */
    function updateSaveButtonState() {
        const isValid = validateSaveEntryForm();
        elements.btnSaveEntry.disabled = !isValid;
        
        if (isValid) {
            elements.btnSaveEntry.classList.remove('btn--disabled');
        } else {
            elements.btnSaveEntry.classList.add('btn--disabled');
        }
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
    // Companies & Categories Dropdowns
    // ========================================

    /**
     * Füllt ein Select-Element mit Unternehmen
     * @param {HTMLSelectElement} selectElement 
     * @param {Array} companies 
     * @param {boolean} includeAll - "Alle" Option hinzufügen
     */
    function populateCompanySelect(selectElement, companies, includeAll = false) {
        const currentValue = selectElement.value;
        
        // Vorhandene Optionen entfernen (außer erste)
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

        // "Alle" Option wenn gewünscht
        if (includeAll) {
            selectElement.options[0].value = 'all';
            selectElement.options[0].textContent = 'Alle';
        }

        // Unternehmen hinzufügen
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = company.name;
            selectElement.appendChild(option);
        });

        // Wert wiederherstellen wenn möglich
        if (currentValue && Array.from(selectElement.options).some(o => o.value === currentValue)) {
            selectElement.value = currentValue;
        }
    }

    /**
     * Füllt ein Select-Element mit Kategorien
     * @param {HTMLSelectElement} selectElement 
     * @param {Array} categories 
     * @param {boolean} includeAddNew - "Neue Kategorie..." Option hinzufügen
     * @param {boolean} includeAll - "Alle" Option hinzufügen
     */
    function populateCategorySelect(selectElement, categories, includeAddNew = false, includeAll = false) {
        const currentValue = selectElement.value;
        
        // Vorhandene Optionen entfernen (außer erste)
        while (selectElement.options.length > 1) {
            selectElement.remove(1);
        }

        // "Alle" Option wenn gewünscht
        if (includeAll) {
            selectElement.options[0].value = 'all';
            selectElement.options[0].textContent = 'Alle';
        }

        // Kategorien hinzufügen
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            selectElement.appendChild(option);
        });

        // "Neue Kategorie..." Option hinzufügen
        if (includeAddNew) {
            const newOption = document.createElement('option');
            newOption.value = '__new__';
            newOption.textContent = '+ Neue Kategorie...';
            selectElement.appendChild(newOption);
        }

        // Wert wiederherstellen wenn möglich
        if (currentValue && currentValue !== '__new__' && Array.from(selectElement.options).some(o => o.value === currentValue)) {
            selectElement.value = currentValue;
        }
    }

    /**
     * Zeigt das Inline-Kategorie-Eingabefeld
     */
    function showInlineAddCategory() {
        elements.inlineAddCategory.classList.add('form__inline-add--visible');
        elements.entryCategory.style.display = 'none';
        elements.inlineCategoryName.value = '';
        elements.inlineCategoryName.focus();
    }

    /**
     * Versteckt das Inline-Kategorie-Eingabefeld
     */
    function hideInlineAddCategory() {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/02bef4e1-27ae-44d0-8fbe-5eca6579cc8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ui.js:hideInlineAddCategory:BEFORE_RESET',message:'Vor dem Zurücksetzen des Dropdowns',data:{currentValue:elements.entryCategory.value},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        elements.inlineAddCategory.classList.remove('form__inline-add--visible');
        elements.entryCategory.style.display = '';
        elements.entryCategory.value = '';
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/02bef4e1-27ae-44d0-8fbe-5eca6579cc8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ui.js:hideInlineAddCategory:AFTER_RESET',message:'Nach dem Zurücksetzen des Dropdowns',data:{newValue:elements.entryCategory.value},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        elements.inlineCategoryName.value = '';
    }

    /**
     * Gibt den eingegebenen Kategorienamen zurück
     * @returns {string}
     */
    function getInlineCategoryName() {
        return elements.inlineCategoryName.value.trim();
    }

    // ========================================
    // Analysis View
    // ========================================

    /**
     * Rendert die Eintrags-Liste
     * @param {Array} entries 
     * @param {Array} companies 
     * @param {Array} categories 
     */
    function renderEntries(entries, companies, categories) {
        // Unternehmen und Kategorien als Map für schnellen Zugriff
        const companyMap = new Map(companies.map(c => [c.id, c.name]));
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        
        // Kategorie-Index-Map für Farben (basierend auf Reihenfolge in categories Array)
        const categoryColorIndexMap = new Map(categories.map((c, index) => [c.id, index]));

        // Leeren State anzeigen/verstecken
        if (entries.length === 0) {
            elements.entriesEmpty.classList.remove('entries__empty--hidden');
            // Alte Einträge entfernen
            elements.entriesList.querySelectorAll('.date-group').forEach(el => el.remove());
            return;
        }
        
        elements.entriesEmpty.classList.add('entries__empty--hidden');

        // Nach Datum gruppieren
        const grouped = Utils.groupEntriesByDate(entries);

        // Container leeren (nur date-groups)
        elements.entriesList.querySelectorAll('.date-group').forEach(el => el.remove());

        // Gruppen rendern
        Object.keys(grouped).forEach(dateKey => {
            const group = grouped[dateKey];
            const groupEl = document.createElement('div');
            groupEl.className = 'date-group';
            
            // Header
            const headerEl = document.createElement('h3');
            headerEl.className = 'date-group__header';
            headerEl.textContent = Utils.formatDate(group.date, 'weekday');
            groupEl.appendChild(headerEl);

            // Einträge
            group.entries.forEach(entry => {
                const categoryColorIndex = entry.categoryId ? categoryColorIndexMap.get(entry.categoryId) : undefined;
                const cardEl = createEntryCard(entry, companyMap, categoryMap, categoryColorIndex);
                groupEl.appendChild(cardEl);
            });

            elements.entriesList.appendChild(groupEl);
        });
    }

    /**
     * Erstellt eine Eintrag-Karte (Layout: Links Info, Rechts Dauer+Aktionen)
     * @param {Object} entry 
     * @param {Map} companyMap 
     * @param {Map} categoryMap 
     * @param {number} categoryColorIndex - Index für die Farbe aus CHART_COLORS
     * @returns {HTMLElement}
     */
    function createEntryCard(entry, companyMap, categoryMap, categoryColorIndex) {
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.dataset.entryId = entry.id;

        const companyName = companyMap.get(entry.companyId) || 'Unbekannt';
        const categoryName = entry.categoryId ? categoryMap.get(entry.categoryId) : null;
        
        // Kategorie-Farbe bestimmen
        const categoryColor = categoryColorIndex !== undefined 
            ? CHART_COLORS[categoryColorIndex % CHART_COLORS.length] 
            : CHART_COLORS[0];

        let html = `
            <div class="entry-card__content">
                <span class="entry-card__company">${escapeHtml(companyName)}</span>
                <div class="entry-card__meta">
                    <span class="entry-card__time">${Utils.formatTimeOfDay(entry.startTime)} – ${Utils.formatTimeOfDay(entry.endTime)}</span>
                    ${categoryName ? `<span class="entry-card__category" style="background-color: ${categoryColor}">${escapeHtml(categoryName)}</span>` : ''}
                </div>
                ${entry.note ? `<p class="entry-card__note">${escapeHtml(entry.note)}</p>` : ''}
            </div>
            <div class="entry-card__right">
                <span class="entry-card__duration">${Utils.formatTime(entry.duration).formatted}</span>
                <div class="entry-card__actions">
                    <button class="entry-card__btn entry-card__btn--edit" data-action="edit" data-id="${entry.id}" aria-label="Bearbeiten">
                        <svg class="entry-card__btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="entry-card__btn entry-card__btn--delete" data-action="delete" data-id="${entry.id}" aria-label="Löschen">
                        <svg class="entry-card__btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        card.innerHTML = html;
        return card;
    }

    // ========================================
    // Management View
    // ========================================

    /**
     * Zeigt die Stammdaten-Unterseite an
     */
    function showStammdatenSubpage() {
        elements.viewManagement.classList.remove('view--active');
        elements.viewManagementData.classList.add('view--active');
    }

    /**
     * Versteckt die Stammdaten-Unterseite und kehrt zur Management-View zurück
     */
    function hideStammdatenSubpage() {
        elements.viewManagementData.classList.remove('view--active');
        elements.viewManagement.classList.add('view--active');
    }

    /**
     * Rendert die Unternehmen-Liste
     * @param {Array} companies 
     */
    function renderCompanies(companies) {
        elements.companiesList.innerHTML = '';

        if (companies.length === 0) {
            if (elements.companiesEmpty) {
                elements.companiesEmpty.classList.remove('management__empty--hidden');
            }
            return;
        }

        if (elements.companiesEmpty) {
            elements.companiesEmpty.classList.add('management__empty--hidden');
        }

        companies.forEach(company => {
            const li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = `
                <span class="list-item__name">${escapeHtml(company.name)}</span>
                <button class="list-item__delete" data-action="delete-company" data-id="${company.id}" aria-label="${company.name} löschen">
                    <svg class="list-item__delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            `;
            elements.companiesList.appendChild(li);
        });
    }

    /**
     * Rendert die Kategorien-Liste mit farbigen Balken
     * @param {Array} categories 
     */
    function renderCategories(categories) {
        elements.categoriesList.innerHTML = '';

        if (categories.length === 0) {
            elements.categoriesEmpty.classList.remove('management__empty--hidden');
            return;
        }

        elements.categoriesEmpty.classList.add('management__empty--hidden');

        categories.forEach((category, index) => {
            const li = document.createElement('li');
            li.className = 'list-item list-item--category';
            // Farbe aus CHART_COLORS basierend auf Index
            const color = CHART_COLORS[index % CHART_COLORS.length];
            li.style.setProperty('--category-color', color);
            li.innerHTML = `
                <span class="list-item__name">${escapeHtml(category.name)}</span>
                <button class="list-item__delete" data-action="delete-category" data-id="${category.id}" aria-label="${category.name} löschen">
                    <svg class="list-item__delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            `;
            elements.categoriesList.appendChild(li);
        });
    }

    /**
     * Validiert die DELETE-Eingabe und aktiviert/deaktiviert den Button
     */
    function updateDeleteAllButtonState() {
        const input = elements.deleteConfirmationInput;
        const btn = elements.btnConfirmDeleteAll;
        
        if (input && btn) {
            const isValid = input.value.toUpperCase() === 'DELETE';
            btn.disabled = !isValid;
            
            if (isValid) {
                btn.classList.remove('btn--disabled');
            } else {
                btn.classList.add('btn--disabled');
            }
        }
    }

    /**
     * Setzt das Delete-All Modal zurück
     */
    function resetDeleteAllModal() {
        if (elements.deleteConfirmationInput) {
            elements.deleteConfirmationInput.value = '';
        }
        updateDeleteAllButtonState();
    }

    // ========================================
    // Save Entry Modal
    // ========================================

    /**
     * Bereitet das Save-Entry Modal vor
     * @param {Object} timerData - { startTime, endTime, duration }
     * @param {Array} companies 
     * @param {Array} categories 
     */
    function prepareSaveEntryModal(timerData, companies, categories) {
        elements.entryDuration.value = Utils.formatTime(timerData.duration).formatted;
        populateCompanySelect(elements.entryCompany, companies);
        populateCategorySelect(elements.entryCategory, categories, true); // Mit "Neue Kategorie..." Option
        elements.entryNote.value = '';
        elements.entryCompany.value = '';
        elements.entryCategory.value = '';
        
        // Inline-Kategorie-Eingabe zurücksetzen
        hideInlineAddCategory();
        
        // Speichern-Button initial deaktivieren
        updateSaveButtonState();
    }

    // ========================================
    // Edit Entry Modal
    // ========================================

    /**
     * Bereitet das Edit-Entry Modal vor
     * @param {Object} entry 
     * @param {Array} companies 
     * @param {Array} categories 
     */
    function prepareEditEntryModal(entry, companies, categories) {
        elements.editEntryId.value = entry.id;
        
        const startDateTime = Utils.timestampToDateTime(entry.startTime);
        const endDateTime = Utils.timestampToDateTime(entry.endTime);
        
        // Datum als Date-Objekt für den Picker
        const entryDate = new Date(entry.startTime);
        updateEditDateDisplay(entryDate);
        
        elements.editStart.value = startDateTime.time;
        elements.editEnd.value = endDateTime.time;
        
        populateCompanySelect(elements.editCompany, companies);
        populateCategorySelect(elements.editCategory, categories);
        
        elements.editCompany.value = entry.companyId;
        elements.editCategory.value = entry.categoryId || '';
        elements.editNote.value = entry.note || '';
        
        // Picker schließen falls noch offen
        hideEditDatePicker();
    }

    // ========================================
    // Delete Confirmation
    // ========================================

    /**
     * Bereitet das Delete-Modal vor
     * @param {string} type - 'entry', 'company', 'category'
     * @param {string} id 
     * @param {string} name - Optionaler Name für die Nachricht
     */
    function prepareDeleteModal(type, id, name = '') {
        elements.deleteItemId.value = id;
        elements.deleteItemType.value = type;

        let message = '';
        switch (type) {
            case 'entry':
                message = 'Möchten Sie diesen Zeiteintrag wirklich löschen?';
                break;
            case 'company':
                message = `Möchten Sie "${name}" wirklich löschen? Bestehende Zeiteinträge bleiben erhalten.`;
                break;
            case 'category':
                message = `Möchten Sie die Kategorie "${name}" wirklich löschen?`;
                break;
        }
        elements.deleteMessage.textContent = message;
    }

    // ========================================
    // Category Chart & Bars
    // ========================================

    // Farben für das Kreisdiagramm und Kategorie-Balken
    const CHART_COLORS = [
        '#4a8a6d', // Waldgrün (chart-1)
        '#9aaa6b', // Olivgrün (chart-2)
        '#d4b565', // Senfgelb (chart-3)
        '#d9967f', // Terrakotta (chart-4)
        '#b06b8a', // Altrosa (chart-5)
        '#7a6b9a', // Lavendel (chart-6)
        '#4a8a8a', // Petrol (chart-7)
        '#5a8fb5'  // Stahlblau (chart-8)
    ];

    /**
     * Berechnet Kategorie-Statistiken aus Einträgen
     * @param {Array} entries - Zeiteinträge
     * @param {Array} categories - Kategorien
     * @returns {Object} { categoryMap, sortedCategories, totalDuration }
     */
    function calculateCategoryStats(entries, categories) {
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        
        // Zeit pro Kategorie berechnen
        const categoryDurations = {};
        let totalDuration = 0;
        
        entries.forEach(entry => {
            const catId = entry.categoryId || '__none__';
            if (!categoryDurations[catId]) {
                categoryDurations[catId] = 0;
            }
            categoryDurations[catId] += entry.duration;
            totalDuration += entry.duration;
        });

        // Sortiere nach Dauer (absteigend)
        const sortedCategories = Object.entries(categoryDurations)
            .sort((a, b) => b[1] - a[1]);

        return { categoryMap, sortedCategories, totalDuration };
    }

    /**
     * Rendert das Donut-Diagramm (nur Donut, ohne Legende)
     * @param {Array} entries - Zeiteinträge
     * @param {Array} categories - Kategorien
     */
    function renderCategoryChart(entries, categories) {
        const { sortedCategories, totalDuration } = calculateCategoryStats(entries, categories);

        // Wenn keine Einträge, leeren Donut zeigen
        if (totalDuration === 0) {
            elements.chartPie.innerHTML = '<p class="category-chart--empty">Keine Daten</p>';
            return;
        }

        // SVG Donut-Diagramm erstellen (größer für neue Ansicht)
        const size = 160;
        const center = size / 2;
        const outerRadius = 70;
        const innerRadius = 45;
        const strokeWidth = outerRadius - innerRadius;
        const strokeRadius = innerRadius + strokeWidth / 2;
        
        let currentAngle = -90; // Start oben
        let paths = '';
        
        sortedCategories.forEach(([catId, duration], index) => {
            const percentage = duration / totalDuration;
            const angle = percentage * 360;
            const color = CHART_COLORS[index % CHART_COLORS.length];
            
            // Für sehr kleine Segmente
            if (angle < 1) return;
            
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1 = center + strokeRadius * Math.cos(startRad);
            const y1 = center + strokeRadius * Math.sin(startRad);
            const x2 = center + strokeRadius * Math.cos(endRad);
            const y2 = center + strokeRadius * Math.sin(endRad);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            // Wenn nur eine Kategorie, zeichne einen Ring
            if (sortedCategories.length === 1) {
                paths += `<circle cx="${center}" cy="${center}" r="${strokeRadius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
            } else {
                paths += `<path d="M ${x1} ${y1} A ${strokeRadius} ${strokeRadius} 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"/>`;
            }
            
            currentAngle = endAngle;
        });

        elements.chartPie.innerHTML = `
            <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                ${paths}
            </svg>
        `;
    }

    /**
     * Rendert die Kategorie-Balken (neue Auswertungsansicht)
     * @param {Array} entries - Zeiteinträge
     * @param {Array} categories - Kategorien
     */
    function renderCategoryBars(entries, categories) {
        const { categoryMap, sortedCategories, totalDuration } = calculateCategoryStats(entries, categories);

        if (totalDuration === 0 || !elements.categoryBars) {
            if (elements.categoryBars) {
                elements.categoryBars.innerHTML = '<p class="category-chart--empty">Keine Daten vorhanden</p>';
            }
            return;
        }

        let barsHtml = '';
        sortedCategories.forEach(([catId, duration], index) => {
            const name = catId === '__none__' ? 'Ohne Kategorie' : (categoryMap.get(catId) || 'Unbekannt');
            const color = CHART_COLORS[index % CHART_COLORS.length];
            const percentage = Math.round((duration / totalDuration) * 100);
            const formattedDuration = Utils.formatDuration(duration);
            
            // Fragezeichen-Icon für "Ohne Kategorie", sonst ersten Buchstaben
            const iconContent = catId === '__none__' 
                ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`
                : '';
            
            barsHtml += `
                <div class="category-bar" style="background-color: ${color}">
                    <div class="category-bar__icon">${iconContent}</div>
                    <span class="category-bar__name">${escapeHtml(name)}</span>
                    <div class="category-bar__stats">
                        <span class="category-bar__duration">${formattedDuration}</span>
                        <span class="category-bar__percent">${percentage}%</span>
                    </div>
                </div>
            `;
        });

        // Gesamt-Balken hinzufügen
        const totalFormattedDuration = Utils.formatDuration(totalDuration);
        barsHtml += `
            <div class="category-bar category-bar--total">
                <div class="category-bar__icon"></div>
                <span class="category-bar__name">Gesamt</span>
                <div class="category-bar__stats">
                    <span class="category-bar__duration">${totalFormattedDuration}</span>
                </div>
            </div>
        `;

        elements.categoryBars.innerHTML = barsHtml;
    }

    // ========================================
    // Date Navigator (Analysis)
    // ========================================

    /**
     * Aktualisiert die Anzeige des Datumsnavigators (Analysis)
     * @param {string} displayText - Anzuzeigender Text (z.B. "JANUAR 2026")
     */
    function updateDateNavigator(displayText) {
        if (elements.dateNavigatorText) {
            elements.dateNavigatorText.textContent = displayText;
        }
    }

    /**
     * Zeigt/Versteckt den Datumsnavigator (Analysis)
     * @param {boolean} visible 
     */
    function setDateNavigatorVisible(visible) {
        if (elements.dateNavigator) {
            elements.dateNavigator.style.display = visible ? 'flex' : 'none';
        }
        // Picker auch verstecken wenn Navigator versteckt wird
        if (!visible) {
            hideDatePicker();
        }
    }

    // ========================================
    // Date Navigator (Entries)
    // ========================================

    /**
     * Aktualisiert die Anzeige des Entries-Datumsnavigators
     * @param {string} displayText - Anzuzeigender Text (z.B. "JANUAR 2026")
     */
    function updateEntriesDateNavigator(displayText) {
        if (elements.entriesDateNavigatorText) {
            elements.entriesDateNavigatorText.textContent = displayText;
        }
    }

    /**
     * Zeigt/Versteckt den Entries-Datumsnavigator
     * @param {boolean} visible 
     */
    function setEntriesDateNavigatorVisible(visible) {
        if (elements.entriesDateNavigator) {
            elements.entriesDateNavigator.style.display = visible ? 'flex' : 'none';
        }
        // Picker auch verstecken wenn Navigator versteckt wird
        if (!visible) {
            hideEntriesDatePicker();
        }
    }

    // ========================================
    // Date Picker
    // ========================================

    // Monatsnamen für Picker
    const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                         'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    // Picker State
    let pickerState = {
        isOpen: false,
        mode: 'day', // 'day', 'week', 'month', 'year'
        viewDate: new Date(), // Aktuell angezeigte Datum im Picker
        selectedDate: new Date(), // Aktuell ausgewählte Datum
        pickerYear: new Date().getFullYear(), // Jahr für Monatspicker
        onDateSelect: null // Callback wenn Datum gewählt wird
    };

    /**
     * Öffnet den Date Picker
     * @param {string} mode - 'day', 'week', 'month', 'year'
     * @param {Date} currentDate - Aktuell ausgewähltes Datum
     * @param {Function} onSelect - Callback bei Datumsauswahl
     */
    function showDatePicker(mode, currentDate, onSelect) {
        pickerState.mode = mode;
        pickerState.selectedDate = new Date(currentDate);
        pickerState.viewDate = new Date(currentDate);
        pickerState.pickerYear = currentDate.getFullYear();
        pickerState.onDateSelect = onSelect;
        pickerState.isOpen = true;

        // Alle Picker-Typen verstecken
        elements.datePickerCalendar.classList.remove('date-picker__calendar--active');
        elements.datePickerMonths.classList.remove('date-picker__months--active');
        elements.datePickerYears.classList.remove('date-picker__years--active');

        // Passenden Picker anzeigen
        switch (mode) {
            case 'day':
            case 'week':
                elements.datePickerCalendar.classList.add('date-picker__calendar--active');
                renderCalendar();
                break;
            case 'month':
                elements.datePickerMonths.classList.add('date-picker__months--active');
                renderMonthPicker();
                break;
            case 'year':
                elements.datePickerYears.classList.add('date-picker__years--active');
                renderYearPicker();
                break;
        }

        elements.datePicker.classList.add('date-picker--open');
        elements.datePickerBackdrop.classList.add('date-picker__backdrop--open');
    }

    /**
     * Schließt den Date Picker
     */
    function hideDatePicker() {
        pickerState.isOpen = false;
        if (elements.datePicker) {
            elements.datePicker.classList.remove('date-picker--open');
        }
        if (elements.datePickerBackdrop) {
            elements.datePickerBackdrop.classList.remove('date-picker__backdrop--open');
        }
    }

    /**
     * Prüft ob der Date Picker offen ist
     * @returns {boolean}
     */
    function isDatePickerOpen() {
        return pickerState.isOpen;
    }

    /**
     * Rendert den Kalender für Tag/Woche-Modus
     */
    function renderCalendar() {
        const viewDate = pickerState.viewDate;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        // Titel aktualisieren
        elements.pickerCalendarTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

        // Erster Tag des Monats
        const firstDay = new Date(year, month, 1);
        // Letzter Tag des Monats
        const lastDay = new Date(year, month + 1, 0);
        
        // Wochentag des ersten Tags (0 = Sonntag, konvertieren zu Montag = 0)
        let startWeekday = firstDay.getDay() - 1;
        if (startWeekday < 0) startWeekday = 6;

        // Tage aus vorherigem Monat
        const prevMonthDays = startWeekday;
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        // Tage generieren
        let html = '';
        let dayCount = 1;
        let nextMonthDay = 1;

        // 6 Wochen maximal
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const cellIndex = week * 7 + day;
                let displayDay, displayMonth, displayYear, isOtherMonth = false;

                if (cellIndex < prevMonthDays) {
                    // Vorheriger Monat
                    displayDay = prevMonthLastDay - prevMonthDays + cellIndex + 1;
                    displayMonth = month - 1;
                    displayYear = year;
                    if (displayMonth < 0) {
                        displayMonth = 11;
                        displayYear--;
                    }
                    isOtherMonth = true;
                } else if (dayCount > lastDay.getDate()) {
                    // Nächster Monat
                    displayDay = nextMonthDay++;
                    displayMonth = month + 1;
                    displayYear = year;
                    if (displayMonth > 11) {
                        displayMonth = 0;
                        displayYear++;
                    }
                    isOtherMonth = true;
                } else {
                    // Aktueller Monat
                    displayDay = dayCount++;
                    displayMonth = month;
                    displayYear = year;
                }

                const cellDate = new Date(displayYear, displayMonth, displayDay);
                const isToday = isSameDayCheck(cellDate, new Date());
                const isSelected = isSameDayCheck(cellDate, pickerState.selectedDate);
                
                // Woche-Modus: Prüfen ob in gleicher Woche wie ausgewählt
                let isInSelectedWeek = false;
                if (pickerState.mode === 'week') {
                    isInSelectedWeek = isSameWeek(cellDate, pickerState.selectedDate);
                }

                let classes = 'date-picker__day';
                if (isOtherMonth) classes += ' date-picker__day--other-month';
                if (isToday) classes += ' date-picker__day--today';
                
                if (pickerState.mode === 'week' && isInSelectedWeek) {
                    classes += ' date-picker__day--week-selected';
                    if (day === 0) classes += ' date-picker__day--week-start';
                    if (day === 6) classes += ' date-picker__day--week-end';
                } else if (pickerState.mode === 'day' && isSelected) {
                    classes += ' date-picker__day--selected';
                }

                html += `<button class="${classes}" data-date="${displayYear}-${displayMonth}-${displayDay}">${displayDay}</button>`;
            }
            
            // Aufhören wenn wir alle Tage des Monats erreicht haben und eine Woche vollendet haben
            if (dayCount > lastDay.getDate() && week >= 3) break;
        }

        elements.pickerDays.innerHTML = html;
    }

    /**
     * Rendert den Monatspicker
     */
    function renderMonthPicker() {
        const year = pickerState.pickerYear;
        const selectedMonth = pickerState.selectedDate.getMonth();
        const selectedYear = pickerState.selectedDate.getFullYear();

        // Titel aktualisieren
        elements.pickerMonthsTitle.textContent = year;

        let html = '';
        MONTH_NAMES_SHORT.forEach((name, index) => {
            const isSelected = (index === selectedMonth && year === selectedYear);
            const classes = 'date-picker__month' + (isSelected ? ' date-picker__month--selected' : '');
            html += `<button class="${classes}" data-month="${index}" data-year="${year}">${name}</button>`;
        });

        elements.pickerMonthGrid.innerHTML = html;
    }

    /**
     * Rendert den Jahrpicker
     */
    function renderYearPicker() {
        const selectedYear = pickerState.selectedDate.getFullYear();

        // Nur 2025, 2026, 2027
        const years = [2027, 2026, 2025];
        let html = '';
        
        years.forEach(year => {
            const isSelected = year === selectedYear;
            const classes = 'date-picker__year' + (isSelected ? ' date-picker__year--selected' : '');
            html += `<button class="${classes}" data-year="${year}">${year}</button>`;
        });

        elements.pickerYearList.innerHTML = html;
    }

    /**
     * Navigiert im Kalender zum vorherigen Monat
     */
    function pickerPrevMonth() {
        pickerState.viewDate.setMonth(pickerState.viewDate.getMonth() - 1);
        renderCalendar();
    }

    /**
     * Navigiert im Kalender zum nächsten Monat
     */
    function pickerNextMonth() {
        pickerState.viewDate.setMonth(pickerState.viewDate.getMonth() + 1);
        renderCalendar();
    }

    /**
     * Navigiert im Monatspicker zum vorherigen Jahr
     */
    function monthPickerPrevYear() {
        pickerState.pickerYear--;
        renderMonthPicker();
    }

    /**
     * Navigiert im Monatspicker zum nächsten Jahr
     */
    function monthPickerNextYear() {
        pickerState.pickerYear++;
        renderMonthPicker();
    }

    /**
     * Handelt Klick auf einen Tag im Kalender
     * @param {string} dateStr - Datum als "YYYY-M-D"
     */
    function handleDayClick(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const selectedDate = new Date(year, month, day);
        
        if (pickerState.onDateSelect) {
            pickerState.onDateSelect(selectedDate);
        }
        hideDatePicker();
    }

    /**
     * Handelt Klick auf einen Monat im Monatspicker
     * @param {number} month - Monat (0-11)
     * @param {number} year - Jahr
     */
    function handleMonthClick(month, year) {
        const selectedDate = new Date(year, month, 1);
        
        if (pickerState.onDateSelect) {
            pickerState.onDateSelect(selectedDate);
        }
        hideDatePicker();
    }

    /**
     * Handelt Klick auf ein Jahr im Jahrpicker
     * @param {number} year - Jahr
     */
    function handleYearClick(year) {
        const selectedDate = new Date(year, 0, 1);
        
        if (pickerState.onDateSelect) {
            pickerState.onDateSelect(selectedDate);
        }
        hideDatePicker();
    }

    /**
     * Prüft ob zwei Daten am gleichen Tag sind (Hilfsfunktion)
     */
    function isSameDayCheck(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    /**
     * Prüft ob zwei Daten in der gleichen Woche sind (Mo-So)
     */
    function isSameWeek(date1, date2) {
        // Montag der jeweiligen Woche berechnen
        const getMonday = (d) => {
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.getFullYear(), d.getMonth(), diff);
        };
        
        const monday1 = getMonday(new Date(date1));
        const monday2 = getMonday(new Date(date2));
        
        return monday1.getTime() === monday2.getTime();
    }

    // ========================================
    // Date Picker (Entries)
    // ========================================

    // Picker State für Entries
    let entriesPickerState = {
        isOpen: false,
        mode: 'day', // 'day', 'week', 'month', 'year'
        viewDate: new Date(),
        selectedDate: new Date(),
        pickerYear: new Date().getFullYear(),
        onDateSelect: null
    };

    /**
     * Öffnet den Entries Date Picker
     */
    function showEntriesDatePicker(mode, currentDate, onSelect) {
        entriesPickerState.mode = mode;
        entriesPickerState.selectedDate = new Date(currentDate);
        entriesPickerState.viewDate = new Date(currentDate);
        entriesPickerState.pickerYear = currentDate.getFullYear();
        entriesPickerState.onDateSelect = onSelect;
        entriesPickerState.isOpen = true;

        // Alle Picker-Typen verstecken
        elements.entriesDatePickerCalendar.classList.remove('date-picker__calendar--active');
        elements.entriesDatePickerMonths.classList.remove('date-picker__months--active');
        elements.entriesDatePickerYears.classList.remove('date-picker__years--active');

        // Passenden Picker anzeigen
        switch (mode) {
            case 'day':
            case 'week':
                elements.entriesDatePickerCalendar.classList.add('date-picker__calendar--active');
                renderEntriesCalendar();
                break;
            case 'month':
                elements.entriesDatePickerMonths.classList.add('date-picker__months--active');
                renderEntriesMonthPicker();
                break;
            case 'year':
                elements.entriesDatePickerYears.classList.add('date-picker__years--active');
                renderEntriesYearPicker();
                break;
        }

        elements.entriesDatePicker.classList.add('date-picker--open');
        elements.entriesDatePickerBackdrop.classList.add('date-picker__backdrop--open');
    }

    /**
     * Schließt den Entries Date Picker
     */
    function hideEntriesDatePicker() {
        entriesPickerState.isOpen = false;
        if (elements.entriesDatePicker) {
            elements.entriesDatePicker.classList.remove('date-picker--open');
        }
        if (elements.entriesDatePickerBackdrop) {
            elements.entriesDatePickerBackdrop.classList.remove('date-picker__backdrop--open');
        }
    }

    /**
     * Prüft ob der Entries Date Picker offen ist
     */
    function isEntriesDatePickerOpen() {
        return entriesPickerState.isOpen;
    }

    /**
     * Rendert den Entries-Kalender
     */
    function renderEntriesCalendar() {
        const viewDate = entriesPickerState.viewDate;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        elements.entriesPickerCalendarTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        let startWeekday = firstDay.getDay() - 1;
        if (startWeekday < 0) startWeekday = 6;

        const prevMonthDays = startWeekday;
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        let html = '';
        let dayCount = 1;
        let nextMonthDay = 1;

        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const cellIndex = week * 7 + day;
                let displayDay, displayMonth, displayYear, isOtherMonth = false;

                if (cellIndex < prevMonthDays) {
                    displayDay = prevMonthLastDay - prevMonthDays + cellIndex + 1;
                    displayMonth = month - 1;
                    displayYear = year;
                    if (displayMonth < 0) {
                        displayMonth = 11;
                        displayYear--;
                    }
                    isOtherMonth = true;
                } else if (dayCount > lastDay.getDate()) {
                    displayDay = nextMonthDay++;
                    displayMonth = month + 1;
                    displayYear = year;
                    if (displayMonth > 11) {
                        displayMonth = 0;
                        displayYear++;
                    }
                    isOtherMonth = true;
                } else {
                    displayDay = dayCount++;
                    displayMonth = month;
                    displayYear = year;
                }

                const cellDate = new Date(displayYear, displayMonth, displayDay);
                const isToday = isSameDayCheck(cellDate, new Date());
                const isSelected = isSameDayCheck(cellDate, entriesPickerState.selectedDate);
                
                let isInSelectedWeek = false;
                if (entriesPickerState.mode === 'week') {
                    isInSelectedWeek = isSameWeek(cellDate, entriesPickerState.selectedDate);
                }

                let classes = 'date-picker__day';
                if (isOtherMonth) classes += ' date-picker__day--other-month';
                if (isToday) classes += ' date-picker__day--today';
                
                if (entriesPickerState.mode === 'week' && isInSelectedWeek) {
                    classes += ' date-picker__day--week-selected';
                    if (day === 0) classes += ' date-picker__day--week-start';
                    if (day === 6) classes += ' date-picker__day--week-end';
                } else if (entriesPickerState.mode === 'day' && isSelected) {
                    classes += ' date-picker__day--selected';
                }

                html += `<button class="${classes}" data-date="${displayYear}-${displayMonth}-${displayDay}">${displayDay}</button>`;
            }
            
            if (dayCount > lastDay.getDate() && week >= 3) break;
        }

        elements.entriesPickerDays.innerHTML = html;
    }

    /**
     * Rendert den Entries-Monatspicker
     */
    function renderEntriesMonthPicker() {
        const year = entriesPickerState.pickerYear;
        const selectedMonth = entriesPickerState.selectedDate.getMonth();
        const selectedYear = entriesPickerState.selectedDate.getFullYear();

        elements.entriesPickerMonthsTitle.textContent = year;

        let html = '';
        MONTH_NAMES_SHORT.forEach((name, index) => {
            const isSelected = (index === selectedMonth && year === selectedYear);
            const classes = 'date-picker__month' + (isSelected ? ' date-picker__month--selected' : '');
            html += `<button class="${classes}" data-month="${index}" data-year="${year}">${name}</button>`;
        });

        elements.entriesPickerMonthGrid.innerHTML = html;
    }

    /**
     * Rendert den Entries-Jahrpicker
     */
    function renderEntriesYearPicker() {
        const selectedYear = entriesPickerState.selectedDate.getFullYear();
        const years = [2027, 2026, 2025];
        let html = '';
        
        years.forEach(year => {
            const isSelected = year === selectedYear;
            const classes = 'date-picker__year' + (isSelected ? ' date-picker__year--selected' : '');
            html += `<button class="${classes}" data-year="${year}">${year}</button>`;
        });

        elements.entriesPickerYearList.innerHTML = html;
    }

    function entriesPickerPrevMonth() {
        entriesPickerState.viewDate.setMonth(entriesPickerState.viewDate.getMonth() - 1);
        renderEntriesCalendar();
    }

    function entriesPickerNextMonth() {
        entriesPickerState.viewDate.setMonth(entriesPickerState.viewDate.getMonth() + 1);
        renderEntriesCalendar();
    }

    function entriesMonthPickerPrevYear() {
        entriesPickerState.pickerYear--;
        renderEntriesMonthPicker();
    }

    function entriesMonthPickerNextYear() {
        entriesPickerState.pickerYear++;
        renderEntriesMonthPicker();
    }

    function handleEntriesDayClick(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const selectedDate = new Date(year, month, day);
        
        if (entriesPickerState.onDateSelect) {
            entriesPickerState.onDateSelect(selectedDate);
        }
        hideEntriesDatePicker();
    }

    function handleEntriesMonthClick(month, year) {
        const selectedDate = new Date(year, month, 1);
        
        if (entriesPickerState.onDateSelect) {
            entriesPickerState.onDateSelect(selectedDate);
        }
        hideEntriesDatePicker();
    }

    function handleEntriesYearClick(year) {
        const selectedDate = new Date(year, 0, 1);
        
        if (entriesPickerState.onDateSelect) {
            entriesPickerState.onDateSelect(selectedDate);
        }
        hideEntriesDatePicker();
    }

    // ========================================
    // Edit Date Picker (im Edit-Entry Modal)
    // ========================================

    // State für Edit-Date-Picker
    let editDatePickerState = {
        isOpen: false,
        viewDate: new Date(),
        selectedDate: new Date(),
        onDateSelect: null
    };

    /**
     * Öffnet den Edit-Date-Picker
     * @param {Date} currentDate - Aktuell ausgewähltes Datum
     * @param {Function} onSelect - Callback bei Datumsauswahl
     */
    function showEditDatePicker(currentDate, onSelect) {
        editDatePickerState.selectedDate = new Date(currentDate);
        editDatePickerState.viewDate = new Date(currentDate);
        editDatePickerState.onDateSelect = onSelect;
        editDatePickerState.isOpen = true;

        renderEditDateCalendar();
        elements.editDatePicker.classList.add('edit-date-picker--open');
    }

    /**
     * Schließt den Edit-Date-Picker
     */
    function hideEditDatePicker() {
        editDatePickerState.isOpen = false;
        if (elements.editDatePicker) {
            elements.editDatePicker.classList.remove('edit-date-picker--open');
        }
    }

    /**
     * Prüft ob der Edit-Date-Picker offen ist
     */
    function isEditDatePickerOpen() {
        return editDatePickerState.isOpen;
    }

    /**
     * Rendert den Edit-Date-Kalender
     */
    function renderEditDateCalendar() {
        const viewDate = editDatePickerState.viewDate;
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        elements.editPickerTitle.textContent = `${MONTH_NAMES[month]} ${year}`;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        let startWeekday = firstDay.getDay() - 1;
        if (startWeekday < 0) startWeekday = 6;

        const prevMonthDays = startWeekday;
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        let html = '';
        let dayCount = 1;
        let nextMonthDay = 1;

        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const cellIndex = week * 7 + day;
                let displayDay, displayMonth, displayYear, isOtherMonth = false;

                if (cellIndex < prevMonthDays) {
                    displayDay = prevMonthLastDay - prevMonthDays + cellIndex + 1;
                    displayMonth = month - 1;
                    displayYear = year;
                    if (displayMonth < 0) {
                        displayMonth = 11;
                        displayYear--;
                    }
                    isOtherMonth = true;
                } else if (dayCount > lastDay.getDate()) {
                    displayDay = nextMonthDay++;
                    displayMonth = month + 1;
                    displayYear = year;
                    if (displayMonth > 11) {
                        displayMonth = 0;
                        displayYear++;
                    }
                    isOtherMonth = true;
                } else {
                    displayDay = dayCount++;
                    displayMonth = month;
                    displayYear = year;
                }

                const cellDate = new Date(displayYear, displayMonth, displayDay);
                const isToday = isSameDayCheck(cellDate, new Date());
                const isSelected = isSameDayCheck(cellDate, editDatePickerState.selectedDate);

                let classes = 'date-picker__day';
                if (isOtherMonth) classes += ' date-picker__day--other-month';
                if (isToday) classes += ' date-picker__day--today';
                if (isSelected) classes += ' date-picker__day--selected';

                html += `<button type="button" class="${classes}" data-date="${displayYear}-${displayMonth}-${displayDay}">${displayDay}</button>`;
            }
            
            if (dayCount > lastDay.getDate() && week >= 3) break;
        }

        elements.editPickerDays.innerHTML = html;
    }

    /**
     * Navigiert zum vorherigen Monat im Edit-Picker
     */
    function editPickerPrevMonth() {
        editDatePickerState.viewDate.setMonth(editDatePickerState.viewDate.getMonth() - 1);
        renderEditDateCalendar();
    }

    /**
     * Navigiert zum nächsten Monat im Edit-Picker
     */
    function editPickerNextMonth() {
        editDatePickerState.viewDate.setMonth(editDatePickerState.viewDate.getMonth() + 1);
        renderEditDateCalendar();
    }

    /**
     * Handelt Klick auf einen Tag im Edit-Picker
     */
    function handleEditDayClick(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const selectedDate = new Date(year, month, day);
        
        editDatePickerState.selectedDate = selectedDate;
        
        if (editDatePickerState.onDateSelect) {
            editDatePickerState.onDateSelect(selectedDate);
        }
        hideEditDatePicker();
    }

    /**
     * Aktualisiert die Datumsanzeige im Edit-Modal
     * @param {Date} date 
     */
    function updateEditDateDisplay(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        if (elements.editDateDisplay) {
            elements.editDateDisplay.textContent = `${day}.${month}.${year}`;
        }
        
        // Hidden Input aktualisieren (Format: YYYY-MM-DD)
        if (elements.editDate) {
            elements.editDate.value = `${year}-${month}-${day}`;
        }
    }

    /**
     * Gibt das aktuell ausgewählte Datum im Edit-Modal zurück
     * @returns {string} Datum im Format YYYY-MM-DD
     */
    function getEditDateValue() {
        return elements.editDate ? elements.editDate.value : '';
    }

    // ========================================
    // Helpers
    // ========================================

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
    // Theme Management
    // ========================================

    const THEME_KEY = 'timetrack-theme';

    /**
     * Initialisiert das Theme basierend auf localStorage oder System-Präferenz
     */
    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // System-Präferenz prüfen
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }

        // Auf System-Änderungen reagieren (falls kein Theme gespeichert)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(THEME_KEY)) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    /**
     * Setzt das Theme
     * @param {string} theme - 'light' oder 'dark'
     */
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
        updateThemeButton(theme);
        updateMetaThemeColor(theme);
    }

    /**
     * Wechselt zwischen Light und Dark Mode
     * @returns {string} Das neue Theme
     */
    function toggleTheme() {
        const currentTheme = getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        return newTheme;
    }

    /**
     * Gibt das aktuelle Theme zurück
     * @returns {string} 'light' oder 'dark'
     */
    function getTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    }

    /**
     * Aktualisiert den Theme-Button Text und Icon
     * @param {string} theme 
     */
    function updateThemeButton(theme) {
        const btn = elements.btnToggleTheme;
        if (!btn) return;

        const iconContainer = btn.querySelector('.management__nav-icon');
        const textSpan = btn.querySelector('span');
        
        if (theme === 'dark') {
            // Im Dark Mode: Sonne-Icon zeigen (zum Wechsel zu Light)
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                `;
            }
            if (textSpan) {
                textSpan.textContent = 'Light Mode aktivieren';
            }
        } else {
            // Im Light Mode: Mond-Icon zeigen (zum Wechsel zu Dark)
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                `;
            }
            if (textSpan) {
                textSpan.textContent = 'Dark Mode aktivieren';
            }
        }
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
        init,
        getElements,
        // Timer
        updateTimerDisplay,
        updateTimerState,
        hideTimerDisplay,
        // Navigation
        switchView,
        // Modals
        openModal,
        closeModal,
        closeAllModals,
        // Discard Confirmation
        openDiscardConfirmation,
        closeDiscardConfirmation,
        isSaveEntryModalOpen,
        isDiscardConfirmationOpen,
        // Initial Company Modal
        openInitialCompanyModal,
        closeInitialCompanyModal,
        // Validation
        validateSaveEntryForm,
        updateSaveButtonState,
        // Inline Category
        showInlineAddCategory,
        hideInlineAddCategory,
        getInlineCategoryName,
        // Toast
        showToast,
        // Dropdowns
        populateCompanySelect,
        populateCategorySelect,
        // Rendering
        renderEntries,
        renderCompanies,
        renderCategories,
        renderCategoryChart,
        renderCategoryBars,
        // Date Navigator (Analysis)
        updateDateNavigator,
        setDateNavigatorVisible,
        // Date Picker (Analysis)
        showDatePicker,
        hideDatePicker,
        isDatePickerOpen,
        renderCalendar,
        renderMonthPicker,
        renderYearPicker,
        pickerPrevMonth,
        pickerNextMonth,
        monthPickerPrevYear,
        monthPickerNextYear,
        handleDayClick,
        handleMonthClick,
        handleYearClick,
        // Date Navigator (Entries)
        updateEntriesDateNavigator,
        setEntriesDateNavigatorVisible,
        // Date Picker (Entries)
        showEntriesDatePicker,
        hideEntriesDatePicker,
        isEntriesDatePickerOpen,
        renderEntriesCalendar,
        renderEntriesMonthPicker,
        renderEntriesYearPicker,
        entriesPickerPrevMonth,
        entriesPickerNextMonth,
        entriesMonthPickerPrevYear,
        entriesMonthPickerNextYear,
        handleEntriesDayClick,
        handleEntriesMonthClick,
        handleEntriesYearClick,
        // Edit Date Picker
        showEditDatePicker,
        hideEditDatePicker,
        isEditDatePickerOpen,
        renderEditDateCalendar,
        editPickerPrevMonth,
        editPickerNextMonth,
        handleEditDayClick,
        updateEditDateDisplay,
        getEditDateValue,
        // Modal Preparation
        prepareSaveEntryModal,
        prepareEditEntryModal,
        prepareDeleteModal,
        // Management Subpage
        showStammdatenSubpage,
        hideStammdatenSubpage,
        // Delete All
        updateDeleteAllButtonState,
        resetDeleteAllModal,
        // Theme
        initTheme,
        setTheme,
        toggleTheme,
        getTheme
    };
})();
