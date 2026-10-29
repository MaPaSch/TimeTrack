/**
 * TimeTrack PWA - Timer View
 * Timer-Seite und Bottom Sheet "Eintrag speichern"
 */

const TimerView = (function() {
    'use strict';

    // Kontext der App: { getCompanies, getCategories, reloadData }
    let ctx = null;

    const els = {};

    // Erfasster Zeitblock nach "Stop": { startTime, endTime, duration }
    let pendingTimerData = null;

    // Felder im Speichern-Sheet
    let companyField = null;
    let categoryField = null;
    let noteField = null;

    // Zurück-Taste (Android) abfangen, solange das Sheet offen ist
    const HISTORY_KEY = 'saveEntrySheet';
    let ignoreNextPop = false;

    const LAST_COMPANY_KEY = 'timetrack-last-company';

    // ========================================
    // Select-or-Create Feld
    // ========================================

    const CREATE_VALUE = '__create__';
    const EMPTY_VALUE = '__empty__';

    /**
     * Dropdown mit Option "+ Neu...", die auf ein Eingabefeld zum Anlegen umschaltet
     * (wie SelectOrCreateField in der Flutter-App)
     * @param {HTMLElement} host
     * @param {Object} options
     * @param {string} options.label - Feldname (für Barrierefreiheit)
     * @param {string} options.createOptionLabel - z. B. "+ Neues Unternehmen..."
     * @param {string} options.createHint - Platzhalter im Eingabefeld
     * @param {string} [options.emptyOptionLabel] - Option für "keine Auswahl" (z. B. "Keine Kategorie")
     * @param {string} [options.emptyCreateHint] - Platzhalter, solange es noch keine Einträge gibt
     * @param {string} [options.selectHint] - Platzhalter, solange nichts ausgewählt ist
     * @param {Function} options.onCreate - async (name) => id, legt an bzw. findet vorhandenen Eintrag
     * @param {Function} options.onChange - Bei jeder Änderung (für Validierung)
     */
    function createSelectOrCreate(host, options) {
        host.classList.add('select-or-create');
        host.innerHTML = `
            <div class="select-or-create__select"></div>
            <button type="button" class="select-or-create__empty input">
                <span class="select-or-create__empty-text">${Components.escapeHtml(options.emptyCreateHint || '')}</span>
                ${Components.icon('add')}
            </button>
            <div class="select-or-create__create">
                <input type="text" class="input" autocomplete="off" autocapitalize="sentences"
                       placeholder="${Components.escapeHtml(options.createHint)}"
                       aria-label="${Components.escapeHtml(options.label)}">
                <button type="button" class="icon-btn" data-create-confirm aria-label="Hinzufügen" title="Hinzufügen">${Components.icon('check')}</button>
                <button type="button" class="icon-btn" data-create-cancel aria-label="Abbrechen" title="Abbrechen">${Components.icon('close')}</button>
            </div>
        `;

        const selectHost = host.querySelector('.select-or-create__select');
        const emptyBtn = host.querySelector('.select-or-create__empty');
        const input = host.querySelector('.select-or-create__create input');

        let items = [];
        let selectedId = null;
        let creating = false;

        const dropdown = Components.createDropdown(selectHost, {
            variant: 'outlined',
            placeholder: options.selectHint || '',
            ariaLabel: options.label,
            onChange: (value) => {
                if (value === CREATE_VALUE) {
                    startCreate();
                } else {
                    selectedId = value === EMPTY_VALUE ? null : value;
                    options.onChange();
                }
            }
        });

        function render() {
            const showEmpty = !creating && items.length === 0 && !!options.emptyCreateHint;
            host.dataset.mode = creating ? 'create' : (showEmpty ? 'empty' : 'select');

            if (!creating && !showEmpty) {
                const list = [];
                if (options.emptyOptionLabel) {
                    list.push({ value: EMPTY_VALUE, label: options.emptyOptionLabel });
                }
                items.forEach(item => list.push({ value: item.id, label: item.name }));
                list.push({ value: CREATE_VALUE, label: options.createOptionLabel, action: true });
                dropdown.setOptions(list);

                const known = items.some(item => item.id === selectedId);
                dropdown.setValue(known ? selectedId : (options.emptyOptionLabel ? EMPTY_VALUE : null));
            }
        }

        function startCreate() {
            creating = true;
            input.value = '';
            render();
            input.focus();
            options.onChange();
        }

        function cancelCreate() {
            creating = false;
            render();
            options.onChange();
        }

        async function confirmCreate() {
            const name = input.value.trim();
            if (!name) {
                input.focus();
                return;
            }
            const id = await options.onCreate(name);
            if (id) {
                creating = false;
                selectedId = id;
                render();
                options.onChange();
            }
        }

        emptyBtn.addEventListener('click', startCreate);
        host.querySelector('[data-create-confirm]').addEventListener('click', confirmCreate);
        host.querySelector('[data-create-cancel]').addEventListener('click', cancelCreate);
        input.addEventListener('input', () => options.onChange());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmCreate();
            }
        });

        return {
            /**
             * Setzt die Auswahlliste und optional die Auswahl; beendet den Anlege-Modus
             */
            reset(newItems, newSelectedId) {
                items = newItems;
                selectedId = newSelectedId;
                creating = false;
                input.value = '';
                render();
            },
            /**
             * Aktualisiert nur die Liste (z. B. nach dem Anlegen in einem anderen Feld)
             */
            setItems(newItems) {
                items = newItems;
                render();
            },
            getState() {
                return {
                    selectedId: items.some(item => item.id === selectedId) ? selectedId : null,
                    creating,
                    newName: input.value.trim()
                };
            }
        };
    }

    // ========================================
    // Timer-Anzeige
    // ========================================

    /**
     * Aktualisiert die Uhr
     * @param {number} elapsed - ms
     */
    function updateDisplay(elapsed) {
        const time = Utils.formatTime(elapsed);
        els.hours.textContent = time.hours;
        els.minutes.textContent = time.minutes;
        els.seconds.textContent = time.seconds;
    }

    /**
     * Aktualisiert Buttons, Status und Uhr-Sichtbarkeit
     * @param {Object} state - { isRunning, isPaused }
     */
    function updateState({ isRunning, isPaused }) {
        const idle = !isRunning && !isPaused;

        els.timer.classList.toggle('timer--running', isRunning);
        els.timer.classList.toggle('timer--paused', isPaused);
        els.display.classList.toggle('timer__display--hidden', idle);

        // Hauptbutton
        els.mainBtn.classList.toggle('timer__button--stop', isRunning);
        els.mainIcon.innerHTML = Components.icon(isRunning ? 'stop' : 'play');
        els.mainText.textContent = isRunning ? 'Stop' : (isPaused ? 'Fortsetzen' : 'Start');
        els.mainBtn.setAttribute('aria-label', isRunning ? 'Timer stoppen' : (isPaused ? 'Timer fortsetzen' : 'Timer starten'));

        // Sekundärbutton (Platz bleibt reserviert)
        els.secondaryBtn.classList.toggle('timer__secondary--hidden', idle);
        els.secondaryBtn.classList.toggle('timer__secondary--stop', isPaused);
        els.secondaryBtn.tabIndex = idle ? -1 : 0;
        els.secondaryBtn.setAttribute('aria-hidden', idle ? 'true' : 'false');
        els.secondaryIcon.innerHTML = Components.icon(isPaused ? 'stop' : 'pause');
        els.secondaryText.textContent = isPaused ? 'Stop' : 'Pause';
        els.secondaryBtn.setAttribute('aria-label', isPaused ? 'Timer stoppen' : 'Timer pausieren');

        els.status.textContent = isRunning ? 'Timer läuft...' : (isPaused ? 'Timer pausiert' : 'Bereit zum Starten');
    }

    function handleMainClick() {
        if (Timer.isRunning()) {
            stopTimer();
        } else if (Timer.isPaused()) {
            Timer.resume();
        } else {
            Timer.start();
        }
    }

    function handleSecondaryClick() {
        if (Timer.isRunning()) {
            Timer.pause();
        } else if (Timer.isPaused()) {
            stopTimer();
        }
    }

    /**
     * Stoppt den Timer: Er bleibt pausiert und gespeichert, bis der Eintrag
     * gespeichert oder verworfen wurde (geht beim Schließen der App nicht verloren).
     */
    function stopTimer() {
        if (Timer.isRunning()) {
            Timer.pause();
        }
        pendingTimerData = {
            startTime: Timer.getStartTime(),
            endTime: Date.now(),
            duration: Timer.getElapsed()
        };
        openSheet();
    }

    // ========================================
    // Speichern-Sheet
    // ========================================

    function openSheet() {
        const companies = ctx.getCompanies();
        const lastCompanyId = localStorage.getItem(LAST_COMPANY_KEY);
        const preselected = companies.some(c => c.id === lastCompanyId) ? lastCompanyId : null;

        els.duration.value = Utils.formatTime(pendingTimerData.duration).formatted;
        companyField.reset(companies, preselected);
        categoryField.reset(ctx.getCategories(), null);
        els.note.value = '';
        noteField.reset();
        setError('');
        updateSaveButton();

        UI.openModal(els.sheet, { autofocus: false });

        history.pushState({ [HISTORY_KEY]: true }, '');
    }

    /**
     * Schließt das Sheet (ohne Rückfrage)
     */
    function closeSheet() {
        UI.closeModal(els.sheet);
        if (history.state && history.state[HISTORY_KEY]) {
            ignoreNextPop = true;
            history.back();
        }
    }

    function isSheetOpen() {
        return els.sheet.classList.contains('modal--open');
    }

    function setError(message) {
        els.error.textContent = message;
        els.error.hidden = !message;
    }

    function isFormValid() {
        const company = companyField.getState();
        return company.creating ? company.newName !== '' : company.selectedId !== null;
    }

    function updateSaveButton() {
        els.saveBtn.disabled = !isFormValid();
    }

    /**
     * Sucht einen Eintrag mit gleichem Namen (ohne Groß-/Kleinschreibung) oder legt ihn an
     * @param {string} kind - 'company' oder 'category'
     * @param {string} name
     * @returns {Promise<string|null>} ID
     */
    async function findOrCreate(kind, name) {
        const list = kind === 'company' ? ctx.getCompanies() : ctx.getCategories();
        const key = name.trim().toLowerCase();
        const existing = list.find(item => item.name.trim().toLowerCase() === key);
        if (existing) return existing.id;

        try {
            const created = kind === 'company'
                ? await DB.addCompany({ name: name.trim() })
                : await DB.addCategory({ name: name.trim() });
            await ctx.reloadData();
            // Andere Liste bleibt gleich, die eigene bekommt den neuen Eintrag
            if (kind === 'company') {
                companyField.setItems(ctx.getCompanies());
            } else {
                categoryField.setItems(ctx.getCategories());
            }
            return created.id;
        } catch (error) {
            console.error('Fehler beim Anlegen:', error);
            setError('Fehler beim Speichern');
            return null;
        }
    }

    async function handleSave(event) {
        if (event) event.preventDefault();
        if (!pendingTimerData) return;

        setError('');

        // Offene Inline-Eingaben zuerst übernehmen
        const company = companyField.getState();
        let companyId = company.selectedId;
        if (company.creating) {
            companyId = company.newName ? await findOrCreate('company', company.newName) : null;
        }
        if (!companyId) {
            setError('Bitte wählen Sie ein Unternehmen');
            return;
        }

        const category = categoryField.getState();
        let categoryId = category.selectedId;
        if (category.creating && category.newName) {
            categoryId = await findOrCreate('category', category.newName);
        }

        const note = els.note.value.trim();
        const entry = {
            companyId,
            categoryId: categoryId || null,
            date: new Date(pendingTimerData.startTime).setHours(0, 0, 0, 0),
            startTime: pendingTimerData.startTime,
            endTime: pendingTimerData.endTime,
            duration: pendingTimerData.duration,
            note: note || null
        };

        try {
            await DB.addTimeEntry(entry);
            localStorage.setItem(LAST_COMPANY_KEY, companyId);

            Timer.reset();
            pendingTimerData = null;
            closeSheet();
            UI.showToast('Eintrag gespeichert', 'success');
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            setError('Fehler beim Speichern');
        }
    }

    function discard() {
        Timer.reset();
        pendingTimerData = null;
        closeSheet();
        UI.showToast('Eintrag verworfen', 'error');
    }

    /**
     * Button "Verwerfen": Rückfrage mit der erfassten Dauer
     */
    async function handleDiscardClick() {
        const confirmed = await Components.confirm({
            title: 'Eintrag verwerfen?',
            text: `Die erfasste Zeit (${els.duration.value}) wird nicht gespeichert.`,
            confirmLabel: 'Verwerfen'
        });
        if (confirmed) discard();
    }

    /**
     * Schließen per ✕, Backdrop, ESC oder Zurück: Speichern / Verwerfen / Abbrechen
     */
    async function requestClose() {
        if (Components.hasOpenDialog()) return;

        const choice = await Components.showDialog({
            title: 'Änderungen speichern?',
            text: 'Sie haben einen Zeiteintrag erfasst. Möchten Sie diesen speichern oder verwerfen?',
            stacked: true,
            buttons: [
                { label: 'Speichern', value: 'save', variant: 'primary' },
                { label: 'Verwerfen', value: 'discard', variant: 'destructive' },
                { label: 'Abbrechen', value: null, variant: 'outlined' }
            ]
        });

        if (choice === 'save') {
            handleSave();
        } else if (choice === 'discard') {
            discard();
        }
    }

    function handlePopState() {
        if (ignoreNextPop) {
            ignoreNextPop = false;
            return;
        }
        if (isSheetOpen()) {
            // Sheet bleibt offen: Zustand wiederherstellen und nachfragen
            history.pushState({ [HISTORY_KEY]: true }, '');
            requestClose();
        }
    }

    // ========================================
    // Initialisierung
    // ========================================

    function cacheElements() {
        els.timer = document.querySelector('#view-timer .timer');
        els.display = document.querySelector('#view-timer .timer__display');
        els.hours = document.getElementById('timer-hours');
        els.minutes = document.getElementById('timer-minutes');
        els.seconds = document.getElementById('timer-seconds');
        els.status = document.getElementById('timer-status');
        els.mainBtn = document.getElementById('btn-timer-main');
        els.mainIcon = document.getElementById('timer-main-icon');
        els.mainText = document.getElementById('timer-main-text');
        els.secondaryBtn = document.getElementById('btn-timer-secondary');
        els.secondaryIcon = document.getElementById('timer-secondary-icon');
        els.secondaryText = document.getElementById('timer-secondary-text');

        els.sheet = document.getElementById('modal-save-entry');
        els.form = document.getElementById('form-save-entry');
        els.duration = document.getElementById('entry-duration');
        els.note = document.getElementById('entry-note');
        els.error = document.getElementById('save-entry-error');
        els.saveBtn = document.getElementById('btn-save-entry');
    }

    /**
     * @param {Object} context - { getCompanies, getCategories, reloadData }
     */
    function init(context) {
        ctx = context;
        cacheElements();

        companyField = createSelectOrCreate(document.getElementById('entry-company-field'), {
            label: 'Unternehmen',
            createOptionLabel: '+ Neues Unternehmen...',
            createHint: 'z. B. Musterfirma GmbH',
            emptyCreateHint: 'Unternehmen hinzufügen',
            selectHint: 'Unternehmen auswählen',
            onCreate: (name) => findOrCreate('company', name),
            onChange: updateSaveButton
        });

        categoryField = createSelectOrCreate(document.getElementById('entry-category-field'), {
            label: 'Kategorie',
            createOptionLabel: '+ Neue Kategorie...',
            createHint: 'z. B. Meetings',
            emptyOptionLabel: 'Keine Kategorie',
            onCreate: (name) => findOrCreate('category', name),
            onChange: updateSaveButton
        });

        noteField = Components.attachSnippetButton(els.note);

        els.mainBtn.addEventListener('click', handleMainClick);
        els.secondaryBtn.addEventListener('click', handleSecondaryClick);

        els.form.addEventListener('submit', handleSave);
        document.getElementById('btn-save-entry-discard').addEventListener('click', handleDiscardClick);
        document.getElementById('btn-save-entry-close').addEventListener('click', requestClose);
        els.sheet.querySelector('.modal__backdrop').addEventListener('click', requestClose);
        window.addEventListener('popstate', handlePopState);

        Timer.setOnTick(updateDisplay);
        Timer.setOnStateChange(updateState);
        updateState({ isRunning: false, isPaused: false });
        Timer.init();
    }

    // Öffentliche API
    return {
        init,
        isSheetOpen,
        requestClose
    };
})();
