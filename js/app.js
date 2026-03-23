/**
 * TimeTrack PWA - Main Application
 * Hauptlogik, Event-Binding und Initialisierung
 */

const App = (function() {
    'use strict';

    // Temporärer Timer-Datenspeicher für Save-Modal
    let pendingTimerData = null;

    // Daten-Cache
    let companies = [];
    let categories = [];

    // Aktuelles Datum für den Datumsnavigator (Analysis)
    let currentNavigatorDate = new Date();
    
    // Aktuelles Datum für den Entries-Datumsnavigator
    let currentEntriesNavigatorDate = new Date();

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

    /**
     * Aktualisiert die Filter-Dropdowns in der Auswertung
     */
    function updateAnalysisFilterDropdowns() {
        const els = UI.getElements();
        UI.populateCompanySelect(els.filterCompany, companies, true);
        
        // Aktuelle ausgewählte Kategorien merken
        const currentSelectedIds = UI.getSelectedCategoryIds(els.filterCategory);
        UI.populateCategoryMultiSelect(els.filterCategory, categories, currentSelectedIds);
    }

    /**
     * Aktualisiert die Filter-Dropdowns in der Einträge-View
     */
    function updateEntriesFilterDropdowns() {
        const els = UI.getElements();
        UI.populateCompanySelect(els.entriesFilterCompany, companies, true);
        
        // Aktuelle ausgewählte Kategorien merken
        const currentSelectedIds = UI.getSelectedCategoryIds(els.entriesFilterCategory);
        UI.populateCategoryMultiSelect(els.entriesFilterCategory, categories, currentSelectedIds);
    }

    /**
     * Lädt und rendert die Zeiteinträge für die Entries-View
     */
    async function loadAndRenderEntriesList() {
        const els = UI.getElements();
        
        const period = els.entriesFilterPeriod.value;
        const companyId = els.entriesFilterCompany.value;
        const selectedCategoryIds = UI.getSelectedCategoryIds(els.entriesFilterCategory);
        
        // categoryId kann jetzt ein Array sein oder 'all'
        const categoryId = selectedCategoryIds.includes('all') ? 'all' : selectedCategoryIds;
        
        // Datumsbereich basierend auf Navigator-Datum berechnen
        const dateRange = Utils.getDateRangeForNavigator(period, currentEntriesNavigatorDate);
        
        try {
            const entries = await DB.getTimeEntries({
                companyId: companyId,
                categoryId: categoryId,
                dateRange: dateRange
            });
            
            UI.renderEntries(entries, companies, categories);
            
            // Datumsnavigator-Text aktualisieren
            const navigatorText = Utils.formatNavigatorDate(period, currentEntriesNavigatorDate);
            UI.updateEntriesDateNavigator(navigatorText);
        } catch (error) {
            console.error('Fehler beim Laden der Einträge:', error);
            UI.showToast('Fehler beim Laden der Einträge', 'error');
        }
    }

    /**
     * Lädt und rendert die Auswertung (Donut + Balken)
     */
    async function loadAndRenderAnalysis() {
        const els = UI.getElements();
        
        const period = els.filterPeriod.value;
        const companyId = els.filterCompany.value;
        const selectedCategoryIds = UI.getSelectedCategoryIds(els.filterCategory);
        
        // categoryId kann jetzt ein Array sein oder 'all'
        const categoryId = selectedCategoryIds.includes('all') ? 'all' : selectedCategoryIds;
        
        // Datumsbereich basierend auf Navigator-Datum berechnen
        const dateRange = Utils.getDateRangeForNavigator(period, currentNavigatorDate);
        
        try {
            const entries = await DB.getTimeEntries({
                companyId: companyId,
                categoryId: categoryId,
                dateRange: dateRange
            });
            
            UI.renderCategoryChart(entries, categories);
            UI.renderCategoryBars(entries, categories);
            
            // Datumsnavigator-Text aktualisieren
            const navigatorText = Utils.formatNavigatorDate(period, currentNavigatorDate);
            UI.updateDateNavigator(navigatorText);
        } catch (error) {
            console.error('Fehler beim Laden der Auswertung:', error);
            UI.showToast('Fehler beim Laden der Auswertung', 'error');
        }
    }

    /**
     * Navigiert im Datumsnavigator vor oder zurück
     * @param {number} direction - 1 für vor, -1 für zurück
     */
    function navigateDate(direction) {
        const els = UI.getElements();
        const period = els.filterPeriod.value;
        
        const newDate = new Date(currentNavigatorDate);
        
        switch (period) {
            case 'day':
                newDate.setDate(newDate.getDate() + direction);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (direction * 7));
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + direction);
                break;
            case 'year':
                newDate.setFullYear(newDate.getFullYear() + direction);
                break;
        }
        
        currentNavigatorDate = newDate;
        loadAndRenderAnalysis();
    }

    /**
     * Setzt den Datumsnavigator auf das aktuelle Datum zurück
     */
    function resetNavigatorDate() {
        currentNavigatorDate = new Date();
    }

    /**
     * Setzt das Navigator-Datum und aktualisiert die Ansicht
     * @param {Date} date - Das neue Datum
     */
    function setNavigatorDate(date) {
        currentNavigatorDate = new Date(date);
        loadAndRenderAnalysis();
    }

    /**
     * Öffnet den Date Picker basierend auf aktuellem Zeitraum
     */
    function handleDateNavigatorClick() {
        const els = UI.getElements();
        const period = els.filterPeriod.value;
        
        // Wenn Picker offen ist, schließen
        if (UI.isDatePickerOpen()) {
            UI.hideDatePicker();
            return;
        }
        
        // Picker öffnen mit passendem Modus
        UI.showDatePicker(period, currentNavigatorDate, (selectedDate) => {
            setNavigatorDate(selectedDate);
        });
    }

    // ========================================
    // Entries Date Navigator
    // ========================================

    /**
     * Navigiert im Entries-Datumsnavigator vor oder zurück
     * @param {number} direction - 1 für vor, -1 für zurück
     */
    function navigateEntriesDate(direction) {
        const els = UI.getElements();
        const period = els.entriesFilterPeriod.value;
        
        const newDate = new Date(currentEntriesNavigatorDate);
        
        switch (period) {
            case 'day':
                newDate.setDate(newDate.getDate() + direction);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (direction * 7));
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + direction);
                break;
            case 'year':
                newDate.setFullYear(newDate.getFullYear() + direction);
                break;
        }
        
        currentEntriesNavigatorDate = newDate;
        loadAndRenderEntriesList();
    }

    /**
     * Setzt den Entries-Datumsnavigator auf das aktuelle Datum zurück
     */
    function resetEntriesNavigatorDate() {
        currentEntriesNavigatorDate = new Date();
    }

    /**
     * Setzt das Entries-Navigator-Datum und aktualisiert die Ansicht
     * @param {Date} date - Das neue Datum
     */
    function setEntriesNavigatorDate(date) {
        currentEntriesNavigatorDate = new Date(date);
        loadAndRenderEntriesList();
    }

    /**
     * Öffnet den Entries Date Picker basierend auf aktuellem Zeitraum
     */
    function handleEntriesDateNavigatorClick() {
        const els = UI.getElements();
        const period = els.entriesFilterPeriod.value;
        
        // Wenn Picker offen ist, schließen
        if (UI.isEntriesDatePickerOpen()) {
            UI.hideEntriesDatePicker();
            return;
        }
        
        // Picker öffnen mit passendem Modus
        UI.showEntriesDatePicker(period, currentEntriesNavigatorDate, (selectedDate) => {
            setEntriesNavigatorDate(selectedDate);
        });
    }

    // ========================================
    // Time Input Handler (24h Format)
    // ========================================

    /**
     * Handler für Time-Input-Eingabe - erlaubt nur Zahlen und Doppelpunkt
     */
    function handleTimeInput(e) {
        let value = e.target.value;
        
        // Nur Zahlen und Doppelpunkt erlauben
        value = value.replace(/[^0-9:]/g, '');
        
        // Automatisch Doppelpunkt einfügen nach 2 Ziffern
        if (value.length === 2 && !value.includes(':')) {
            value = value + ':';
        }
        
        // Maximal ein Doppelpunkt
        const parts = value.split(':');
        if (parts.length > 2) {
            value = parts[0] + ':' + parts.slice(1).join('');
        }
        
        // Stunden begrenzen (00-23)
        if (parts[0] && parts[0].length >= 2) {
            const hours = parseInt(parts[0], 10);
            if (hours > 23) {
                parts[0] = '23';
                value = parts.join(':');
            }
        }
        
        // Minuten begrenzen (00-59)
        if (parts[1] && parts[1].length >= 2) {
            const minutes = parseInt(parts[1], 10);
            if (minutes > 59) {
                parts[1] = '59';
                value = parts.join(':');
            }
        }
        
        e.target.value = value;
    }

    /**
     * Formatiert die Zeit beim Verlassen des Feldes
     */
    function formatTimeOnBlur(e) {
        let value = e.target.value;
        
        if (!value) return;
        
        // Wenn nur Zahlen ohne Doppelpunkt
        if (!value.includes(':')) {
            if (value.length <= 2) {
                value = value.padStart(2, '0') + ':00';
            } else if (value.length === 3) {
                value = '0' + value.charAt(0) + ':' + value.substring(1);
            } else if (value.length === 4) {
                value = value.substring(0, 2) + ':' + value.substring(2);
            }
        }
        
        const parts = value.split(':');
        if (parts.length === 2) {
            parts[0] = parts[0].padStart(2, '0');
            parts[1] = parts[1].padEnd(2, '0').substring(0, 2);
            
            // Validierung
            let hours = parseInt(parts[0], 10);
            let minutes = parseInt(parts[1], 10);
            
            if (isNaN(hours)) hours = 0;
            if (isNaN(minutes)) minutes = 0;
            if (hours > 23) hours = 23;
            if (minutes > 59) minutes = 59;
            
            value = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
        }
        
        e.target.value = value;
    }

    // ========================================
    // Edit Date Picker Handler
    // ========================================

    /**
     * Handler für Klick auf den Edit-Date-Button
     */
    function handleEditDateBtnClick() {
        const els = UI.getElements();
        
        // Wenn Picker offen ist, schließen
        if (UI.isEditDatePickerOpen()) {
            UI.hideEditDatePicker();
            return;
        }
        
        // Aktuelles Datum aus dem hidden Input lesen
        const currentDateStr = els.editDate.value;
        let currentDate;
        
        if (currentDateStr) {
            const [year, month, day] = currentDateStr.split('-').map(Number);
            currentDate = new Date(year, month - 1, day);
        } else {
            currentDate = new Date();
        }
        
        // Picker öffnen
        UI.showEditDatePicker(currentDate, (selectedDate) => {
            UI.updateEditDateDisplay(selectedDate);
        });
    }

    /**
     * Rendert die Verwaltungs-View
     */
    function renderManagement() {
        UI.renderCompanies(companies);
        UI.renderCategories(categories);
    }

    // ========================================
    // Timer Event Handlers
    // ========================================

    function handleTimerMainClick() {
        if (Timer.isRunning()) {
            // Timer läuft -> Stop (Eintrag speichern)
            const result = Timer.stop();
            if (result) {
                pendingTimerData = result;
                UI.prepareSaveEntryModal(result, companies, categories);
                UI.openModal(UI.getElements().modalSaveEntry);
            }
        } else if (Timer.isPaused()) {
            // Timer pausiert -> Fortsetzen
            Timer.resume();
        } else {
            // Timer gestoppt -> Start
            Timer.start();
        }
    }

    function handleTimerSecondaryClick() {
        if (Timer.isRunning()) {
            // Timer läuft -> Pause
            Timer.pause();
        } else if (Timer.isPaused()) {
            // Timer pausiert -> Stop (Eintrag speichern)
            const result = Timer.stop();
            if (result) {
                pendingTimerData = result;
                UI.prepareSaveEntryModal(result, companies, categories);
                UI.openModal(UI.getElements().modalSaveEntry);
            }
        }
    }

    function handleTimerTick(elapsed) {
        UI.updateTimerDisplay(elapsed);
    }

    function handleTimerStateChange(state) {
        UI.updateTimerState(state.isRunning, state.isPaused);
        if (!state.isRunning && !state.isPaused && state.elapsed === 0) {
            UI.updateTimerDisplay(0);
        }
    }

    // ========================================
    // Navigation Handler
    // ========================================

    function handleNavigation(viewName) {
        UI.switchView(viewName);
        
        // Date Navigator nur in entsprechender View anzeigen
        UI.setDateNavigatorVisible(viewName === 'analysis');
        UI.setEntriesDateNavigatorVisible(viewName === 'entries');
        
        // Daten für View laden
        if (viewName === 'entries') {
            updateEntriesFilterDropdowns();
            resetEntriesNavigatorDate();
            loadAndRenderEntriesList();
        } else if (viewName === 'analysis') {
            updateAnalysisFilterDropdowns();
            resetNavigatorDate();
            loadAndRenderAnalysis();
        } else if (viewName === 'management') {
            renderManagement();
        }
    }

    // ========================================
    // Form Handlers
    // ========================================

    async function handleSaveEntry(event) {
        if (event) {
            event.preventDefault();
        }
        
        if (!pendingTimerData) {
            UI.showToast('Keine Timer-Daten vorhanden', 'error');
            return false;
        }

        const els = UI.getElements();
        let companyId = els.entryCompany.value;
        const categoryId = els.entryCategory.value;

        // Inline-Company-Eingabe aktiv?
        if (UI.isInlineAddCompanyVisible()) {
            const companyName = UI.getInlineCompanyName();
            if (!companyName) {
                UI.showToast('Bitte Unternehmensname eingeben', 'error');
                els.inlineCompanyName.focus();
                return false;
            }
            try {
                const newCompany = await DB.addCompany({ name: companyName });
                await loadData();
                companyId = newCompany.id;
            } catch (error) {
                console.error('Fehler beim Anlegen des Unternehmens:', error);
                UI.showToast('Fehler beim Anlegen des Unternehmens', 'error');
                return false;
            }
        }
        
        if (!companyId) {
            UI.showToast('Bitte wählen Sie ein Unternehmen', 'error');
            els.entryCompany.focus();
            return false;
        }

        const entry = {
            companyId: companyId,
            categoryId: categoryId || null,
            date: new Date(pendingTimerData.startTime).setHours(0, 0, 0, 0),
            startTime: pendingTimerData.startTime,
            endTime: pendingTimerData.endTime,
            duration: pendingTimerData.duration,
            note: els.entryNote.value.trim() || null
        };

        try {
            await DB.addTimeEntry(entry);
            
            localStorage.setItem('timetrack-last-company', companyId);
            
            UI.closeModal(els.modalSaveEntry);
            Timer.reset();
            pendingTimerData = null;
            UI.hideTimerDisplay();
            UI.showToast('Eintrag gespeichert', 'success');
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            UI.showToast('Fehler beim Speichern', 'error');
            return false;
        }
    }

    /**
     * Verwirft den Timer-Eintrag und schließt das Modal
     */
    function handleDiscardEntry() {
        const els = UI.getElements();
        UI.closeDiscardConfirmation();
        UI.closeModal(els.modalSaveEntry);
        Timer.reset();
        pendingTimerData = null;
        UI.hideTimerDisplay();
        UI.showToast('Eintrag verworfen', 'error');
    }

    /**
     * Handler für Discard-Button oder X-Button
     */
    function handleDiscardButtonClick() {
        handleDiscardEntry();
    }

    /**
     * Handler für Backdrop-Klick auf Save-Entry Modal
     */
    function handleSaveEntryBackdropClick() {
        UI.openDiscardConfirmation();
    }

    /**
     * Handler für Speichern-Button im Confirmation Dialog
     */
    async function handleConfirmSave() {
        UI.closeDiscardConfirmation();
        const success = await handleSaveEntry();
        if (!success) {
            // Wenn Speichern fehlschlägt, bleiben wir im Modal
        }
    }

    /**
     * Handler für Verwerfen-Button im Confirmation Dialog
     */
    function handleConfirmDiscard() {
        handleDiscardEntry();
    }

    /**
     * Handler für Abbrechen-Button im Confirmation Dialog
     */
    function handleConfirmCancel() {
        UI.closeDiscardConfirmation();
    }

    /**
     * Handler für Unternehmen-Dropdown Änderung
     */
    function handleCompanyChange() {
        const els = UI.getElements();
        if (els.entryCompany.value === '__new__') {
            UI.showInlineAddCompany();
        } else {
            UI.hideInlineAddCompany();
            UI.updateSaveButtonState();
        }
    }

    /**
     * Handler für Kategorie-Dropdown Änderung
     */
    function handleCategoryChange() {
        const els = UI.getElements();
        if (els.entryCategory.value === '__new__') {
            UI.showInlineAddCategory();
        } else {
            UI.updateSaveButtonState();
        }
    }

    /**
     * Handler für Inline-Kategorie hinzufügen
     */
    async function handleInlineAddCategory() {
        const name = UI.getInlineCategoryName();
        
        if (!name) {
            UI.showToast('Bitte geben Sie einen Namen ein', 'error');
            return;
        }

        try {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/02bef4e1-27ae-44d0-8fbe-5eca6579cc8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:handleInlineAddCategory:ENTRY',message:'Inline-Kategorie wird angelegt',data:{name:name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            const newCategory = await DB.addCategory({ name });
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/02bef4e1-27ae-44d0-8fbe-5eca6579cc8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:handleInlineAddCategory:AFTER_DB_ADD',message:'Kategorie in DB angelegt',data:{newCategoryId:newCategory.id,newCategoryName:newCategory.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            await loadData();
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/02bef4e1-27ae-44d0-8fbe-5eca6579cc8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:handleInlineAddCategory:AFTER_LOAD_DATA',message:'Daten neu geladen',data:{categoriesCount:categories.length,categoryIds:categories.map(c=>c.id)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
            // #endregion
            
            // Dropdown aktualisieren und neue Kategorie auswählen
            const els = UI.getElements();
            UI.populateCategorySelect(els.entryCategory, categories, true);
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/02bef4e1-27ae-44d0-8fbe-5eca6579cc8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:handleInlineAddCategory:BEFORE_SET_VALUE',message:'Dropdown befüllt, setze Value',data:{newCategoryId:newCategory.id,dropdownOptionsCount:els.entryCategory.options.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            els.entryCategory.value = newCategory.id;
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/02bef4e1-27ae-44d0-8fbe-5eca6579cc8d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app.js:handleInlineAddCategory:AFTER_SET_VALUE',message:'Value gesetzt',data:{actualValue:els.entryCategory.value,expectedValue:newCategory.id,match:els.entryCategory.value===newCategory.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            UI.hideInlineAddCategory();
            UI.updateSaveButtonState();
            UI.showToast('Kategorie hinzugefügt', 'success');
        } catch (error) {
            console.error('Fehler beim Hinzufügen der Kategorie:', error);
            UI.showToast('Fehler beim Hinzufügen', 'error');
        }
    }

    /**
     * Handler für Inline-Kategorie abbrechen
     */
    function handleInlineCancelCategory() {
        UI.hideInlineAddCategory();
    }

    /**
     * Handler für Inline-Unternehmen hinzufügen
     */
    async function handleInlineAddCompany() {
        const name = UI.getInlineCompanyName();

        if (!name) {
            UI.showToast('Bitte geben Sie einen Namen ein', 'error');
            return;
        }

        try {
            const newCompany = await DB.addCompany({ name });
            await loadData();

            const els = UI.getElements();
            UI.populateCompanySelect(els.entryCompany, companies, false, true);
            els.entryCompany.value = newCompany.id;

            UI.hideInlineAddCompany();
            UI.updateSaveButtonState();
            UI.showToast('Unternehmen hinzugefügt', 'success');
        } catch (error) {
            console.error('Fehler beim Anlegen des Unternehmens:', error);
            UI.showToast('Fehler beim Anlegen des Unternehmens', 'error');
        }
    }

    /**
     * Handler für Inline-Unternehmen abbrechen
     */
    function handleInlineCancelCompany() {
        UI.hideInlineAddCompany();
    }

    async function handleEditEntry(event) {
        event.preventDefault();

        const els = UI.getElements();
        const entryId = els.editEntryId.value;
        
        if (!entryId) return;

        const dateStr = els.editDate.value;
        const startTimeStr = els.editStart.value;
        const endTimeStr = els.editEnd.value;
        
        const startTime = Utils.dateTimeToTimestamp(dateStr, startTimeStr);
        const endTime = Utils.dateTimeToTimestamp(dateStr, endTimeStr);
        
        if (endTime <= startTime) {
            UI.showToast('Endzeit muss nach Startzeit liegen', 'error');
            return;
        }

        const entry = {
            id: entryId,
            companyId: els.editCompany.value,
            categoryId: els.editCategory.value || null,
            date: new Date(startTime).setHours(0, 0, 0, 0),
            startTime: startTime,
            endTime: endTime,
            duration: endTime - startTime,
            note: els.editNote.value.trim() || null
        };

        try {
            // Hole den alten Eintrag um createdAt zu behalten
            const oldEntry = await DB.getTimeEntry(entryId);
            entry.createdAt = oldEntry.createdAt;
            
            await DB.updateTimeEntry(entry);
            UI.closeModal(els.modalEditEntry);
            await loadAndRenderEntriesList();
            UI.showToast('Eintrag aktualisiert', 'success');
        } catch (error) {
            console.error('Fehler beim Aktualisieren:', error);
            UI.showToast('Fehler beim Aktualisieren', 'error');
        }
    }

    async function handleAddCompany(event) {
        event.preventDefault();

        const els = UI.getElements();
        const name = els.companyName.value.trim();
        
        if (!name) {
            UI.showToast('Bitte geben Sie einen Namen ein', 'error');
            return;
        }

        try {
            await DB.addCompany({ name });
            await loadData();
            UI.closeModal(els.modalAddCompany);
            renderManagement();
            UI.showToast('Unternehmen hinzugefügt', 'success');
        } catch (error) {
            console.error('Fehler beim Hinzufügen:', error);
            UI.showToast('Fehler beim Hinzufügen', 'error');
        }
    }

    /**
     * Handler für das Speichern des ersten Unternehmens (Initial Setup)
     */
    async function handleSaveInitialCompany(event) {
        event.preventDefault();

        const els = UI.getElements();
        const name = els.initialCompanyName.value.trim();
        
        if (!name) {
            UI.showToast('Bitte geben Sie einen Unternehmensnamen ein', 'error');
            els.initialCompanyName.focus();
            return;
        }

        try {
            await DB.addCompany({ name });
            await loadData();
            UI.closeInitialCompanyModal();
            UI.showToast('Willkommen bei TimeTrack!', 'success');
        } catch (error) {
            console.error('Fehler beim Anlegen des Unternehmens:', error);
            UI.showToast('Fehler beim Anlegen', 'error');
        }
    }

    async function handleAddCategory(event) {
        event.preventDefault();

        const els = UI.getElements();
        const name = els.categoryName.value.trim();
        
        if (!name) {
            UI.showToast('Bitte geben Sie einen Namen ein', 'error');
            return;
        }

        try {
            await DB.addCategory({ name });
            await loadData();
            UI.closeModal(els.modalAddCategory);
            renderManagement();
            UI.showToast('Kategorie hinzugefügt', 'success');
        } catch (error) {
            console.error('Fehler beim Hinzufügen:', error);
            UI.showToast('Fehler beim Hinzufügen', 'error');
        }
    }

    async function handleConfirmDelete() {
        const els = UI.getElements();
        const id = els.deleteItemId.value;
        const type = els.deleteItemType.value;

        try {
            // Bei Cloud-Modus Löschung in Sync-Queue eintragen, damit sie in die Cloud übernommen wird
            const typeToStore = { entry: 'timeEntries', company: 'companies', category: 'categories' };
            const storeName = typeToStore[type];
            if (storeName && Auth.isCloudMode()) {
                await DB.addToSyncQueue(storeName, id, 'delete');
            }

            switch (type) {
                case 'entry':
                    await DB.deleteTimeEntry(id);
                    await loadAndRenderEntriesList();
                    break;
                case 'company':
                    await DB.deleteCompany(id);
                    await loadData();
                    renderManagement();
                    break;
                case 'category':
                    await DB.deleteCategory(id);
                    await loadData();
                    renderManagement();
                    break;
            }

            // Bei Cloud-Modus sofort Push auslösen, damit Löschungen in die DB übernommen werden
            if (storeName && isCloudMode) {
                const stats = { pushed: { companies: 0, categories: 0, timeEntries: 0 }, errors: [] };
                Sync.pushPendingChanges(stats).catch(err => console.error('Sync nach Löschung:', err));
            }
            
            UI.closeModal(els.modalConfirmDelete);
            UI.showToast('Erfolgreich gelöscht', 'success');
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            UI.showToast('Fehler beim Löschen', 'error');
        }
    }

    // ========================================
    // Entry Actions Handler
    // ========================================

    async function handleEntryAction(action, entryId) {
        if (action === 'edit') {
            try {
                const entry = await DB.getTimeEntry(entryId);
                if (entry) {
                    UI.prepareEditEntryModal(entry, companies, categories);
                    UI.openModal(UI.getElements().modalEditEntry);
                }
            } catch (error) {
                console.error('Fehler beim Laden des Eintrags:', error);
                UI.showToast('Fehler beim Laden', 'error');
            }
        } else if (action === 'delete') {
            UI.prepareDeleteModal('entry', entryId);
            UI.openModal(UI.getElements().modalConfirmDelete);
        }
    }

    // ========================================
    // Management View Handlers
    // ========================================

    /**
     * Öffnet die Stammdaten-Unterseite
     */
    function handleOpenStammdaten() {
        UI.showStammdatenSubpage();
        renderManagement();
    }

    /**
     * Schließt die Stammdaten-Unterseite und kehrt zur Management View zurück
     */
    function handleBackToManagement() {
        UI.hideStammdatenSubpage();
    }

    /**
     * Öffnet das Export-Format Modal
     */
    function handleExportClick() {
        const els = UI.getElements();
        UI.openModal(els.modalExportFormat);
    }

    /**
     * Generiert einen Dateinamen mit Datum
     * @param {string} extension - Dateiendung (json, csv)
     * @returns {string}
     */
    function generateExportFilename(extension) {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        return `timetrack-export-${date}.${extension}`;
    }

    /**
     * Löst einen Datei-Download aus
     * @param {string} content - Dateiinhalt
     * @param {string} filename - Dateiname
     * @param {string} mimeType - MIME-Type
     */
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Exportiert Daten als JSON
     */
    async function handleExportAsJson() {
        const els = UI.getElements();
        UI.closeModal(els.modalExportFormat);

        try {
            const data = await DB.getAllData();
            
            const exportData = {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                data: data
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = generateExportFilename('json');
            
            downloadFile(jsonString, filename, 'application/json');
            
            const totalCount = data.companies.length + data.categories.length + data.timeEntries.length;
            UI.showToast(`${totalCount} Einträge exportiert`, 'success');
        } catch (error) {
            console.error('Fehler beim JSON-Export:', error);
            UI.showToast('Export fehlgeschlagen', 'error');
        }
    }

    /**
     * Formatiert Dauer in Stunden:Minuten:Sekunden
     * @param {number} ms - Dauer in Millisekunden
     * @returns {string}
     */
    function formatDurationForCsv(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Formatiert Zeitstempel als Uhrzeit (HH:MM)
     * @param {number} timestamp 
     * @returns {string}
     */
    function formatTimeForCsv(timestamp) {
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * Formatiert Datum für CSV (DD.MM.YYYY)
     * @param {number} timestamp 
     * @returns {string}
     */
    function formatDateForCsv(timestamp) {
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    /**
     * Escaped einen CSV-Wert (Semikolon als Trennzeichen)
     * @param {string} value 
     * @returns {string}
     */
    function escapeCsvValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const str = String(value);
        // Wenn der Wert Semikolon, Anführungszeichen oder Zeilenumbruch enthält
        if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    /**
     * Exportiert Daten als CSV
     */
    async function handleExportAsCsv() {
        const els = UI.getElements();
        UI.closeModal(els.modalExportFormat);

        try {
            const data = await DB.getAllData();
            
            // Maps für schnellen Lookup
            const companyMap = new Map(data.companies.map(c => [c.id, c.name]));
            const categoryMap = new Map(data.categories.map(c => [c.id, c.name]));

            // CSV Header (Semikolon-getrennt für deutsches Excel)
            const headers = ['Datum', 'Start', 'Ende', 'Dauer', 'Unternehmen', 'Kategorie', 'Notiz'];
            const rows = [headers.join(';')];

            // Einträge nach Datum sortieren (neueste zuerst)
            const sortedEntries = [...data.timeEntries].sort((a, b) => b.startTime - a.startTime);

            for (const entry of sortedEntries) {
                const row = [
                    formatDateForCsv(entry.startTime),
                    formatTimeForCsv(entry.startTime),
                    formatTimeForCsv(entry.endTime),
                    formatDurationForCsv(entry.duration),
                    escapeCsvValue(companyMap.get(entry.companyId) || 'Unbekannt'),
                    escapeCsvValue(entry.categoryId ? categoryMap.get(entry.categoryId) || '' : ''),
                    escapeCsvValue(entry.note || '')
                ];
                rows.push(row.join(';'));
            }

            // BOM für UTF-8 Excel-Kompatibilität
            const bom = '\uFEFF';
            const csvContent = bom + rows.join('\r\n');
            const filename = generateExportFilename('csv');
            
            downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
            
            UI.showToast(`${data.timeEntries.length} Zeiteinträge exportiert`, 'success');
        } catch (error) {
            console.error('Fehler beim CSV-Export:', error);
            UI.showToast('Export fehlgeschlagen', 'error');
        }
    }

    /**
     * Validiert Import-Daten
     * @param {Object} data - Importierte Daten
     * @returns {Object} { valid: boolean, error?: string }
     */
    function validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Ungültiges Datenformat' };
        }

        // Prüfen ob es ein TimeTrack-Export ist
        if (!data.version || !data.data) {
            return { valid: false, error: 'Keine gültige TimeTrack-Exportdatei' };
        }

        const { companies, categories, timeEntries } = data.data;

        // Arrays prüfen
        if (companies && !Array.isArray(companies)) {
            return { valid: false, error: 'Ungültiges Format: companies muss ein Array sein' };
        }
        if (categories && !Array.isArray(categories)) {
            return { valid: false, error: 'Ungültiges Format: categories muss ein Array sein' };
        }
        if (timeEntries && !Array.isArray(timeEntries)) {
            return { valid: false, error: 'Ungültiges Format: timeEntries muss ein Array sein' };
        }

        return { valid: true };
    }

    /**
     * Import Handler - öffnet Dateiauswahl
     */
    function handleImportClick() {
        const els = UI.getElements();
        if (els.fileImportInput) {
            els.fileImportInput.value = ''; // Reset für erneute Auswahl derselben Datei
            els.fileImportInput.click();
        } else {
            UI.showToast('Import nicht verfügbar', 'error');
        }
    }

    /**
     * Verarbeitet die ausgewählte Import-Datei
     * @param {Event} event 
     */
    async function handleImportFileSelected(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Nur JSON-Dateien akzeptieren
        if (!file.name.endsWith('.json')) {
            UI.showToast('Nur JSON-Dateien werden unterstützt', 'error');
            return;
        }

        try {
            const content = await readFileAsText(file);
            const data = JSON.parse(content);

            // Validierung
            const validation = validateImportData(data);
            if (!validation.valid) {
                UI.showToast(validation.error, 'error');
                return;
            }

            // Legacy-Daten migrieren (falls nötig)
            const migrationResult = migrateLegacyImportData(data.data);
            const importData = migrationResult.data;

            // Import durchführen
            const stats = await DB.importData(importData);
            
            // Daten neu laden
            await loadData();
            
            // Nach Import: Navigator-Datum auf neuesten importierten Eintrag setzen
            if (importData.timeEntries && importData.timeEntries.length > 0) {
                const newestEntry = importData.timeEntries.reduce((newest, entry) => {
                    return (!newest || entry.startTime > newest.startTime) ? entry : newest;
                }, null);
                
                if (newestEntry && newestEntry.startTime) {
                    const newestDate = new Date(newestEntry.startTime);
                    currentEntriesNavigatorDate = newestDate;
                    currentNavigatorDate = newestDate;
                }
            }

            // Erfolgsmeldung
            const added = stats.companiesAdded + stats.categoriesAdded + stats.entriesAdded;
            if (added > 0) {
                let message = `Import erfolgreich: `;
                const parts = [];
                if (stats.companiesAdded > 0) parts.push(`${stats.companiesAdded} Unternehmen`);
                if (stats.categoriesAdded > 0) parts.push(`${stats.categoriesAdded} Kategorien`);
                if (stats.entriesAdded > 0) parts.push(`${stats.entriesAdded} Einträge`);
                message += parts.join(', ');
                UI.showToast(message, 'success');
                
                // Hinweis auf Migration anzeigen
                if (migrationResult.wasMigrated) {
                    setTimeout(() => {
                        UI.showToast('Veraltete IDs wurden automatisch konvertiert', 'info');
                    }, 2000);
                }
            } else {
                UI.showToast('Keine neuen Daten importiert (alle bereits vorhanden)', 'info');
            }
        } catch (error) {
            console.error('Fehler beim Import:', error);
            if (error instanceof SyntaxError) {
                UI.showToast('Ungültige JSON-Datei', 'error');
            } else {
                UI.showToast('Import fehlgeschlagen', 'error');
            }
        }
    }

    /**
     * Liest eine Datei als Text
     * @param {File} file 
     * @returns {Promise<string>}
     */
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
            reader.readAsText(file);
        });
    }

    /**
     * Prüft ob eine ID ein gültiges UUID-Format hat
     * @param {string} id - Die zu prüfende ID
     * @returns {boolean}
     */
    function isValidUuid(id) {
        if (!id || typeof id !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }

    /**
     * Migriert veraltete Import-Daten mit beschreibenden IDs auf UUID-Format
     * @param {Object} data - Die zu migrierenden Daten
     * @returns {Object} - { data: migrierte Daten, wasMigrated: boolean }
     */
    function migrateLegacyImportData(data) {
        const { companies = [], categories = [], timeEntries = [] } = data;
        
        // Prüfen ob Migration nötig ist
        const needsMigration = 
            companies.some(c => !isValidUuid(c.id)) ||
            categories.some(c => !isValidUuid(c.id)) ||
            timeEntries.some(e => !isValidUuid(e.id));
        
        if (!needsMigration) {
            return { data, wasMigrated: false };
        }
        
        // ID-Mapping erstellen (alte ID → neue UUID)
        const idMap = new Map();
        
        // Companies migrieren
        const migratedCompanies = companies.map(company => {
            if (isValidUuid(company.id)) {
                return company;
            }
            const newId = Utils.generateId();
            idMap.set(company.id, newId);
            return { ...company, id: newId };
        });
        
        // Categories migrieren
        const migratedCategories = categories.map(category => {
            if (isValidUuid(category.id)) {
                return category;
            }
            const newId = Utils.generateId();
            idMap.set(category.id, newId);
            return { ...category, id: newId };
        });
        
        // TimeEntries migrieren (inkl. Referenzen)
        const migratedTimeEntries = timeEntries.map(entry => {
            const migrated = { ...entry };
            
            // Entry-ID migrieren
            if (!isValidUuid(entry.id)) {
                migrated.id = Utils.generateId();
            }
            
            // CompanyId-Referenz aktualisieren
            if (entry.companyId && idMap.has(entry.companyId)) {
                migrated.companyId = idMap.get(entry.companyId);
            }
            
            // CategoryId-Referenz aktualisieren
            if (entry.categoryId && idMap.has(entry.categoryId)) {
                migrated.categoryId = idMap.get(entry.categoryId);
            }
            
            return migrated;
        });
        
        return {
            data: {
                companies: migratedCompanies,
                categories: migratedCategories,
                timeEntries: migratedTimeEntries
            },
            wasMigrated: true
        };
    }

    /**
     * Theme Toggle Handler - wechselt zwischen Light und Dark Mode
     */
    function handleThemeToggle() {
        const newTheme = UI.toggleTheme();
        const message = newTheme === 'dark' ? 'Dark Mode aktiviert' : 'Light Mode aktiviert';
        UI.showToast(message, 'success');
    }

    /**
     * Öffnet das Delete-All Modal
     */
    function handleDeleteAllClick() {
        const els = UI.getElements();
        UI.resetDeleteAllModal();
        UI.updateDeleteAllRadioState(Auth.isCloudMode());
        UI.openModal(els.modalDeleteAll);
    }

    /**
     * Führt das Löschen aller Daten durch
     */
    async function handleConfirmDeleteAll() {
        const scope = UI.getDeleteScope();
        
        try {
            // Lokale Daten immer löschen
            await DB.deleteAllData();

            // Bei "nur lokale Daten": Sync-Queue leeren, damit keine Pending-Deletes beim nächsten Sync in die Cloud gehen
            if (scope !== 'both') {
                await DB.clearSyncQueue();
            }

            // Cloud-Daten nur wenn "both" gewählt und angemeldet
            if (scope === 'both' && Auth.isCloudMode()) {
                const result = await SupabaseClient.hardDeleteAllUserData();
                if (!result.success) {
                    console.error('Fehler beim Löschen der Cloud-Daten:', result.error);
                    UI.showToast('Lokale Daten gelöscht, Cloud-Fehler', 'warning');
                }
            }
            
            await loadData();
            
            const els = UI.getElements();
            UI.closeModal(els.modalDeleteAll);
            UI.resetDeleteAllModal();
            
            // Zur Management-Hauptseite zurückkehren falls auf Unterseite
            UI.hideStammdatenSubpage();
            
            const message = scope === 'both' 
                ? 'Alle lokalen und Cloud-Daten wurden gelöscht' 
                : 'Alle lokalen Daten wurden gelöscht';
            UI.showToast(message, 'success');
        } catch (error) {
            console.error('Fehler beim Löschen aller Daten:', error);
            UI.showToast('Fehler beim Löschen', 'error');
        }
    }

    // ========================================
    // Management Actions Handler
    // ========================================

    async function handleManagementAction(action, id) {
        if (action === 'delete-company') {
            const company = companies.find(c => c.id === id);
            if (company) {
                const count = await DB.countEntriesForCompany(id);
                if (count > 0) {
                    UI.prepareDeleteModal('company', id, `${company.name} (${count} Einträge)`);
                } else {
                    UI.prepareDeleteModal('company', id, company.name);
                }
                UI.openModal(UI.getElements().modalConfirmDelete);
            }
        } else if (action === 'delete-category') {
            const category = categories.find(c => c.id === id);
            if (category) {
                UI.prepareDeleteModal('category', id, category.name);
                UI.openModal(UI.getElements().modalConfirmDelete);
            }
        } else if (action === 'rename-company') {
            const company = companies.find(c => c.id === id);
            if (company) {
                UI.prepareRenameModal('company', id, company.name);
                UI.openModal(UI.getElements().modalRenameItem);
            }
        } else if (action === 'rename-category') {
            const category = categories.find(c => c.id === id);
            if (category) {
                UI.prepareRenameModal('category', id, category.name);
                UI.openModal(UI.getElements().modalRenameItem);
            }
        }
    }

    async function handleRenameSubmit() {
        const els = UI.getElements();
        const id = els.renameItemId.value;
        const type = els.renameItemType.value;
        const newName = (els.renameItemName.value || '').trim();

        if (!newName) {
            UI.showToast('Bitte einen Namen eingeben', 'error');
            return;
        }

        try {
            if (type === 'company') {
                const company = await DB.getCompany(id);
                if (company) {
                    await DB.updateCompany({ ...company, name: newName });
                }
            } else if (type === 'category') {
                const category = await DB.getCategory(id);
                if (category) {
                    await DB.updateCategory({ ...category, name: newName });
                }
            }
            await loadData();
            renderManagement();
            if (Auth.isCloudMode()) {
                const stats = { pushed: { companies: 0, categories: 0, timeEntries: 0 }, errors: [] };
                Sync.pushPendingChanges(stats).catch(err => console.error('Sync nach Umbenennen:', err));
            }
            UI.closeModal(els.modalRenameItem);
            UI.showToast('Erfolgreich umbenannt', 'success');
        } catch (error) {
            console.error('Fehler beim Umbenennen:', error);
            UI.showToast('Fehler beim Umbenennen', 'error');
        }
    }

    // ========================================
    // Modal Close Handler
    // ========================================

    function handleModalClose(modal) {
        // Save-Entry Modal hat spezielle Behandlung
        if (modal.id === 'modal-save-entry') {
            // Nicht direkt schließen - Confirmation zeigen
            return;
        }
        
        // Edit-Date-Picker schließen falls offen
        if (modal.id === 'modal-edit-entry') {
            UI.hideEditDatePicker();
        }
        
        UI.closeModal(modal);
    }

    // ========================================
    // Multi-Select Category Filter Events
    // ========================================

    /**
     * Bindet Event-Handler für ein Multi-Select Kategorie-Filter
     * @param {HTMLElement} multiSelectEl - Das Multi-Select Container Element
     * @param {Function} onChangeCallback - Callback bei Änderung
     * @param {Array} categoriesRef - Referenz auf Kategorien-Array für UI-Updates
     */
    function bindCategoryMultiSelectEvents(multiSelectEl, onChangeCallback, categoriesRef) {
        if (!multiSelectEl) return;
        
        const trigger = multiSelectEl.querySelector('.filter-bar__multiselect-trigger');
        const allCheckbox = multiSelectEl.querySelector('.filter-bar__multiselect-all input[type="checkbox"]');
        const optionsContainer = multiSelectEl.querySelector('.filter-bar__multiselect-options');
        
        // Trigger-Klick öffnet/schließt Dropdown
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                UI.toggleCategoryMultiSelect(multiSelectEl);
            });
        }
        
        // "Alle" Checkbox
        if (allCheckbox) {
            allCheckbox.addEventListener('change', () => {
                const isChecked = allCheckbox.checked;
                const categoryCheckboxes = multiSelectEl.querySelectorAll('.filter-bar__multiselect-options input[type="checkbox"]');
                
                categoryCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
                
                UI.updateCategoryMultiSelectUI(multiSelectEl, categoriesRef);
                onChangeCallback();
            });
        }
        
        // Einzelne Kategorie-Checkboxen (Event Delegation)
        if (optionsContainer) {
            optionsContainer.addEventListener('change', (e) => {
                if (e.target.matches('input[type="checkbox"]')) {
                    const categoryCheckboxes = multiSelectEl.querySelectorAll('.filter-bar__multiselect-options input[type="checkbox"]');
                    const allChecked = Array.from(categoryCheckboxes).every(cb => cb.checked);
                    const noneChecked = Array.from(categoryCheckboxes).every(cb => !cb.checked);
                    
                    // "Alle" Checkbox aktualisieren
                    if (allCheckbox) {
                        allCheckbox.checked = allChecked;
                    }
                    
                    // Wenn keine ausgewählt, wieder alle auswählen
                    if (noneChecked && allCheckbox) {
                        allCheckbox.checked = true;
                        categoryCheckboxes.forEach(cb => cb.checked = true);
                    }
                    
                    UI.updateCategoryMultiSelectUI(multiSelectEl, categoriesRef);
                    onChangeCallback();
                }
            });
        }
        
        // Klicks außerhalb schließen das Dropdown
        document.addEventListener('click', (e) => {
            if (UI.isCategoryMultiSelectOpen(multiSelectEl) && !multiSelectEl.contains(e.target)) {
                UI.closeAllCategoryMultiSelects();
            }
        });
    }

    // ========================================
    // Event Binding
    // ========================================

    function bindEvents() {
        const els = UI.getElements();

        // Timer Buttons
        els.btnTimerMain.addEventListener('click', handleTimerMainClick);
        els.btnTimerSecondary.addEventListener('click', handleTimerSecondaryClick);

        // Navigation
        els.navItems.forEach(item => {
            item.addEventListener('click', () => {
                handleNavigation(item.dataset.nav);
            });
        });

        // Filter Changes (Analysis View)
        els.filterPeriod.addEventListener('change', () => {
            UI.hideDatePicker();
            resetNavigatorDate();
            loadAndRenderAnalysis();
        });
        els.filterCompany.addEventListener('change', loadAndRenderAnalysis);
        
        // Filter Changes (Entries View)
        els.entriesFilterPeriod.addEventListener('change', () => {
            UI.hideEntriesDatePicker();
            resetEntriesNavigatorDate();
            loadAndRenderEntriesList();
        });
        els.entriesFilterCompany.addEventListener('change', loadAndRenderEntriesList);
        
        // Multi-Select Category Filter (Analysis View)
        bindCategoryMultiSelectEvents(els.filterCategory, loadAndRenderAnalysis, categories);
        
        // Multi-Select Category Filter (Entries View)
        bindCategoryMultiSelectEvents(els.entriesFilterCategory, loadAndRenderEntriesList, categories);
        
        // Entries Date Navigator Buttons
        els.btnEntriesDatePrev.addEventListener('click', () => navigateEntriesDate(-1));
        els.btnEntriesDateNext.addEventListener('click', () => navigateEntriesDate(1));
        
        // Entries Date Navigator Display (öffnet Picker)
        els.entriesDateNavigatorDisplay.addEventListener('click', handleEntriesDateNavigatorClick);
        
        // Entries Date Picker Backdrop (schließt Picker)
        els.entriesDatePickerBackdrop.addEventListener('click', () => UI.hideEntriesDatePicker());
        
        // Entries Date Picker Kalender Navigation
        els.btnEntriesPickerPrev.addEventListener('click', () => UI.entriesPickerPrevMonth());
        els.btnEntriesPickerNext.addEventListener('click', () => UI.entriesPickerNextMonth());
        
        // Entries Date Picker Monat Navigation
        els.btnEntriesMonthPickerPrev.addEventListener('click', () => UI.entriesMonthPickerPrevYear());
        els.btnEntriesMonthPickerNext.addEventListener('click', () => UI.entriesMonthPickerNextYear());
        
        // Entries Date Picker Tag-Klicks (Event Delegation)
        els.entriesPickerDays.addEventListener('click', (e) => {
            const dayBtn = e.target.closest('.date-picker__day');
            if (dayBtn && dayBtn.dataset.date) {
                UI.handleEntriesDayClick(dayBtn.dataset.date);
            }
        });
        
        // Entries Date Picker Monat-Klicks (Event Delegation)
        els.entriesPickerMonthGrid.addEventListener('click', (e) => {
            const monthBtn = e.target.closest('.date-picker__month');
            if (monthBtn) {
                const month = parseInt(monthBtn.dataset.month, 10);
                const year = parseInt(monthBtn.dataset.year, 10);
                UI.handleEntriesMonthClick(month, year);
            }
        });
        
        // Entries Date Picker Jahr-Klicks (Event Delegation)
        els.entriesPickerYearList.addEventListener('click', (e) => {
            const yearBtn = e.target.closest('.date-picker__year');
            if (yearBtn) {
                const year = parseInt(yearBtn.dataset.year, 10);
                UI.handleEntriesYearClick(year);
            }
        });
        
        // Date Navigator Buttons
        els.btnDatePrev.addEventListener('click', () => navigateDate(-1));
        els.btnDateNext.addEventListener('click', () => navigateDate(1));
        
        // Date Navigator Display (öffnet Picker)
        els.dateNavigatorDisplay.addEventListener('click', handleDateNavigatorClick);
        
        // Date Picker Backdrop (schließt Picker)
        els.datePickerBackdrop.addEventListener('click', () => UI.hideDatePicker());
        
        // Date Picker Kalender Navigation
        els.btnPickerPrev.addEventListener('click', () => UI.pickerPrevMonth());
        els.btnPickerNext.addEventListener('click', () => UI.pickerNextMonth());
        
        // Date Picker Monat Navigation
        els.btnMonthPickerPrev.addEventListener('click', () => UI.monthPickerPrevYear());
        els.btnMonthPickerNext.addEventListener('click', () => UI.monthPickerNextYear());
        
        // Date Picker Tag-Klicks (Event Delegation)
        els.pickerDays.addEventListener('click', (e) => {
            const dayBtn = e.target.closest('.date-picker__day');
            if (dayBtn && dayBtn.dataset.date) {
                UI.handleDayClick(dayBtn.dataset.date);
            }
        });
        
        // Date Picker Monat-Klicks (Event Delegation)
        els.pickerMonthGrid.addEventListener('click', (e) => {
            const monthBtn = e.target.closest('.date-picker__month');
            if (monthBtn) {
                const month = parseInt(monthBtn.dataset.month, 10);
                const year = parseInt(monthBtn.dataset.year, 10);
                UI.handleMonthClick(month, year);
            }
        });
        
        // Date Picker Jahr-Klicks (Event Delegation)
        els.pickerYearList.addEventListener('click', (e) => {
            const yearBtn = e.target.closest('.date-picker__year');
            if (yearBtn) {
                const year = parseInt(yearBtn.dataset.year, 10);
                UI.handleYearClick(year);
            }
        });

        // Forms
        els.formSaveEntry.addEventListener('submit', handleSaveEntry);
        els.formEditEntry.addEventListener('submit', handleEditEntry);
        els.formAddCompany.addEventListener('submit', handleAddCompany);
        els.formAddCategory.addEventListener('submit', handleAddCategory);
        els.formInitialCompany.addEventListener('submit', handleSaveInitialCompany);
        
        // Edit Date Picker
        els.editDateBtn.addEventListener('click', handleEditDateBtnClick);
        els.btnEditPickerPrev.addEventListener('click', () => UI.editPickerPrevMonth());
        els.btnEditPickerNext.addEventListener('click', () => UI.editPickerNextMonth());
        
        // Time Input Formatierung (24h Format)
        els.editStart.addEventListener('input', handleTimeInput);
        els.editEnd.addEventListener('input', handleTimeInput);
        els.editStart.addEventListener('blur', formatTimeOnBlur);
        els.editEnd.addEventListener('blur', formatTimeOnBlur);
        
        // Edit Date Picker Tag-Klicks (Event Delegation)
        els.editPickerDays.addEventListener('click', (e) => {
            const dayBtn = e.target.closest('.date-picker__day');
            if (dayBtn && dayBtn.dataset.date) {
                UI.handleEditDayClick(dayBtn.dataset.date);
            }
        });
        
        // Klick außerhalb des Edit-Date-Pickers schließt diesen
        document.addEventListener('click', (e) => {
            if (UI.isEditDatePickerOpen()) {
                const picker = els.editDatePicker;
                const btn = els.editDateBtn;
                if (!picker.contains(e.target) && !btn.contains(e.target)) {
                    UI.hideEditDatePicker();
                }
            }
        });

        // Add Buttons
        els.btnAddCompany.addEventListener('click', () => {
            UI.openModal(els.modalAddCompany);
        });
        
        els.btnAddCategory.addEventListener('click', () => {
            UI.openModal(els.modalAddCategory);
        });

        // Delete Confirm
        els.btnConfirmDelete.addEventListener('click', handleConfirmDelete);

        // Rename (Unternehmen/Kategorie)
        if (els.btnConfirmRename) {
            els.btnConfirmRename.addEventListener('click', handleRenameSubmit);
        }

        // Discard Confirmation Buttons
        els.btnConfirmSave.addEventListener('click', handleConfirmSave);
        els.btnConfirmDiscard.addEventListener('click', handleConfirmDiscard);
        els.btnConfirmCancel.addEventListener('click', handleConfirmCancel);

        // Save-Entry Discard Buttons (X-Button und Verwerfen)
        document.querySelectorAll('[data-discard-entry]').forEach(btn => {
            btn.addEventListener('click', handleDiscardButtonClick);
        });

        // Save-Entry Backdrop Click
        document.querySelectorAll('[data-save-entry-backdrop]').forEach(backdrop => {
            backdrop.addEventListener('click', handleSaveEntryBackdropClick);
        });

        // Save-Entry Form Field Changes (für Validierung)
        els.entryCompany.addEventListener('change', handleCompanyChange);
        els.entryCategory.addEventListener('change', handleCategoryChange);

        // Inline Add Category
        els.btnInlineAddCategory.addEventListener('click', handleInlineAddCategory);
        els.btnInlineCancelCategory.addEventListener('click', handleInlineCancelCategory);

        // Enter-Taste im Inline-Kategorie-Feld
        els.inlineCategoryName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleInlineAddCategory();
            } else if (e.key === 'Escape') {
                handleInlineCancelCategory();
            }
        });

        // Inline Add Company
        els.btnInlineAddCompany.addEventListener('click', handleInlineAddCompany);
        if (els.btnInlineCancelCompany) {
            els.btnInlineCancelCompany.addEventListener('click', handleInlineCancelCompany);
        }
        els.inlineCompanyName.addEventListener('input', UI.updateSaveButtonState);
        els.inlineCompanyName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleInlineAddCompany();
            } else if (e.key === 'Escape') {
                handleInlineCancelCompany();
            }
        });

        // Modal Close Buttons (für andere Modals)
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    handleModalClose(modal);
                }
            });
        });

        // Entries List Actions (Event Delegation)
        els.entriesList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) {
                handleEntryAction(btn.dataset.action, btn.dataset.id);
            }
        });

        // Companies List Actions (Event Delegation)
        els.companiesList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) {
                handleManagementAction(btn.dataset.action, btn.dataset.id);
            }
        });

        // Categories List Actions (Event Delegation)
        els.categoriesList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) {
                handleManagementAction(btn.dataset.action, btn.dataset.id);
            }
        });

        // Management View Buttons
        if (els.btnToggleTheme) {
            els.btnToggleTheme.addEventListener('click', handleThemeToggle);
        }
        if (els.btnOpenStammdaten) {
            els.btnOpenStammdaten.addEventListener('click', handleOpenStammdaten);
        }
        if (els.btnBackManagement) {
            els.btnBackManagement.addEventListener('click', handleBackToManagement);
        }
        if (els.btnImport) {
            els.btnImport.addEventListener('click', handleImportClick);
        }
        if (els.fileImportInput) {
            els.fileImportInput.addEventListener('change', handleImportFileSelected);
        }
        if (els.btnExport) {
            els.btnExport.addEventListener('click', handleExportClick);
        }
        if (els.btnDeleteAll) {
            els.btnDeleteAll.addEventListener('click', handleDeleteAllClick);
        }

        // Export Format Modal Buttons
        if (els.btnExportAsJson) {
            els.btnExportAsJson.addEventListener('click', handleExportAsJson);
        }
        if (els.btnExportAsCsv) {
            els.btnExportAsCsv.addEventListener('click', handleExportAsCsv);
        }

        // Delete All Modal
        if (els.deleteConfirmationInput) {
            els.deleteConfirmationInput.addEventListener('input', UI.updateDeleteAllButtonState);
        }
        if (els.btnConfirmDeleteAll) {
            els.btnConfirmDeleteAll.addEventListener('click', handleConfirmDeleteAll);
        }

        // Profile/Cloud Buttons
        if (els.btnOpenProfile) {
            els.btnOpenProfile.addEventListener('click', handleOpenProfile);
        }
        if (els.btnBackProfile) {
            els.btnBackProfile.addEventListener('click', handleBackToManagementFromProfile);
        }
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
        
        // ESC to close modals (mit spezieller Behandlung für Save-Entry)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Wenn Date Picker offen ist, zuerst diesen schließen
                if (UI.isDatePickerOpen()) {
                    UI.hideDatePicker();
                    return;
                }
                
                // Wenn Entries Date Picker offen ist, zuerst diesen schließen
                if (UI.isEntriesDatePickerOpen()) {
                    UI.hideEntriesDatePicker();
                    return;
                }
                
                // Wenn Edit Date Picker offen ist, zuerst diesen schließen
                if (UI.isEditDatePickerOpen()) {
                    UI.hideEditDatePicker();
                    return;
                }
                
                // Wenn Discard-Confirmation offen ist, nur diesen schließen
                if (UI.isDiscardConfirmationOpen()) {
                    UI.closeDiscardConfirmation();
                    return;
                }
                
                // Wenn Save-Entry Modal offen ist, Confirmation zeigen
                if (UI.isSaveEntryModalOpen()) {
                    UI.openDiscardConfirmation();
                    return;
                }
                
                // Für andere Modals: normal schließen
                UI.closeAllModals();
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
     * Öffnet die Profil-Unterseite
     */
    function handleOpenProfile() {
        UI.showProfileSubpage();
    }

    /**
     * Schließt die Profil-Unterseite
     */
    function handleBackToManagementFromProfile() {
        UI.hideProfileSubpage();
    }

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
                UI.showToast('Erfolgreich angemeldet', 'success');
                
                // Prüfen ob Migration nötig ist
                const localData = await DB.getAllData();
                const localCount = localData.timeEntries.length;
                
                // Cloud-Daten zählen
                let cloudCount = 0;
                try {
                    const { data: cloudEntries } = await SupabaseClient.fetchUserData('time_entries');
                    cloudCount = cloudEntries ? cloudEntries.length : 0;
                } catch (e) {
                    cloudCount = 0;
                }
                
                // Lokal + Cloud vorhanden: automatisch zusammenführen
                if (localCount > 0 && cloudCount > 0) {
                    UI.showToast('Daten werden zusammengeführt...', 'info');
                    try {
                        await Sync.migrateLocalToCloud();
                        // Sync läuft bereits durch SIGNED_IN (startAutoSync). Nicht erneut syncAll()
                        // aufrufen – sonst already_syncing oder Doppel-Sync. UI-Update via sync_complete.
                        Sync.startAutoSync();
                    } catch (err) {
                        console.error('Migration Merge Error:', err);
                        UI.showToast('Zusammenführung fehlgeschlagen', 'error');
                    }
                } else if (localCount > 0 && cloudCount === 0) {
                    // Nur lokale Daten -> automatisch hochladen
                    const migrationResult = await Sync.migrateLocalToCloud();
                    if (migrationResult.success) {
                        UI.showToast('Daten erfolgreich synchronisiert', 'success');
                    }
                } else if (localCount === 0 && cloudCount > 0) {
                    // Nur Cloud-Daten -> automatisch herunterladen
                    const pullResult = await Sync.pullFromCloud();
                    if (pullResult.success) {
                        await loadData();
                        UI.showToast('Cloud-Daten geladen', 'success');
                    }
                }
                
                // Sync starten
                Sync.startAutoSync();
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
                UI.updateProfileUI(Auth.getUser());
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
     * Handler für Kennwort-Ändern-Formular (direktes Update in Supabase)
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
            const msg = 'Das Passwort muss mindestens 6 Zeichen haben.';
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
                const msg = error.message || 'Kennwort konnte nicht aktualisiert werden.';
                if (els.changePasswordError) {
                    els.changePasswordError.textContent = msg;
                }
                UI.showToast(msg, 'error');
                return;
            }

            UI.showToast('Kennwort wurde aktualisiert', 'success');
            UI.hideChangePasswordForm();
        } catch (err) {
            console.error('Change password error:', err);
            UI.showToast('Kennwort konnte nicht aktualisiert werden.', 'error');
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
        // INITIAL_SESSION und SIGNED_IN beide als "eingeloggt" behandeln
        isAuthenticated = (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && user !== null;
        
        UI.updateProfileUI(isAuthenticated, user?.email || '');
        
        if (isAuthenticated) {
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
                UI.updateSyncStatus('synced', 'Alles synchronisiert', Sync.getLastSyncFormatted());
                // Nach Sync Daten aus IndexedDB neu laden und UI aktualisieren (z. B. gepullte Unternehmen/Kategorien)
                try {
                    await loadData();
                    updateEntriesFilterDropdowns();
                    updateAnalysisFilterDropdowns();
                    renderManagement();
                    await loadAndRenderEntriesList();
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
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registriert:', registration.scope);
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
                // #region agent log
                fetch('http://127.0.0.1:7586/ingest/8726b05c-8248-44ce-855c-3a7e775ae39d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2d836f'},body:JSON.stringify({sessionId:'2d836f',location:'app.js:init',message:'Auth redirect URL params',data:{hash:location.hash?location.hash.substring(0,80):'',hasTypeRecovery:hashParams.get('type')==='recovery',error:hashParams.get('error')||searchParams.get('error'),errorCode:hashParams.get('error_code')||searchParams.get('error_code')},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
                // #endregion
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

            // Timer initialisieren
            Timer.setOnTick(handleTimerTick);
            Timer.setOnStateChange(handleTimerStateChange);
            Timer.init();

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
                UI.showProfileSubpage();
                UI.openResetPasswordModal();
            }

            // Redirect mit Fehler (z. B. Link abgelaufen): URL bereinigen, Profil anzeigen, Hinweis + Modal „Passwort vergessen“
            if (pendingResetLinkError) {
                pendingResetLinkError = false;
                if (typeof history.replaceState === 'function') {
                    history.replaceState(null, '', location.pathname + location.search || '');
                }
                UI.switchView('management');
                UI.showProfileSubpage();
                UI.showToast('Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen Link an.', 'info');
                UI.openForgotPasswordModal();
            }

            // Sync-Listener VOR Sync.init() registrieren, damit sync_complete nach dem ersten
            // Login-Sync die UI aktualisiert (sonst kann sync_complete vor der Registrierung feuern).
            Sync.onSyncChange(handleSyncStateChange);
            Sync.init();

            // Initial-Company-Modal wird nicht mehr beim App-Start angezeigt.
            // Stattdessen wird beim ersten Speichern automatisch ein Unternehmen erstellt.

            console.log('TimeTrack PWA initialisiert (v' + Config.APP_VERSION + ')');
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
