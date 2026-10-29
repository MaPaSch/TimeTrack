/**
 * TimeTrack PWA - Management View
 * Seite "Verwaltung" mit Unterseiten Datenverwaltung, Textbausteine und
 * Cloud & Profil; Import/Export und "Alle Daten löschen"
 */

const ManagementView = (function() {
    'use strict';

    // Kontext der App: { getCompanies, getCategories, reloadData, deleteRecord, refreshViews }
    let ctx = null;

    const els = {};

    const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
    // Plausibler Bereich für importierte Zeitstempel (2000-01-01 bis 2100-01-01)
    const MIN_IMPORT_TIMESTAMP = Date.UTC(2000, 0, 1);
    const MAX_IMPORT_TIMESTAMP = Date.UTC(2100, 0, 1);

    // ========================================
    // Unterseiten (eigene AppBar, Zurück per Pfeil, Browser/Android-Zurück und ESC)
    // ========================================

    const HISTORY_KEY = 'subpage';
    let currentSubpage = null;
    let ignoreNextPop = false;
    let mainScrollY = 0;

    /**
     * Öffnet eine Unterseite
     * @param {string} name - 'management-data', 'text-snippets' oder 'profile'
     */
    function openSubpage(name) {
        showSubpage(name);
        history.pushState({ [HISTORY_KEY]: name }, '');
    }

    function showSubpage(name) {
        els.management.classList.remove('view--active');
        document.querySelectorAll('.view--subpage').forEach(view => {
            view.classList.toggle('view--active', view.id === `view-${name}`);
        });
        els.app.classList.add('app--subpage');
        // Scrollposition der Hauptseite merken, Unterseite beginnt oben
        mainScrollY = window.scrollY;
        window.scrollTo(0, 0);
        currentSubpage = name;

        if (name === 'management-data') {
            renderMasterData();
        } else if (name === 'text-snippets') {
            renderSnippets();
        }
    }

    function hideSubpage() {
        document.querySelectorAll('.view--subpage').forEach(view => view.classList.remove('view--active'));
        els.management.classList.add('view--active');
        els.app.classList.remove('app--subpage');
        window.scrollTo(0, mainScrollY);
        currentSubpage = null;
    }

    /**
     * Schließt die offene Unterseite (Zurück-Pfeil, ESC)
     */
    function closeSubpage() {
        if (!currentSubpage) return;
        hideSubpage();
        if (history.state && history.state[HISTORY_KEY]) {
            ignoreNextPop = true;
            history.back();
        }
    }

    function isSubpageOpen() {
        return currentSubpage !== null;
    }

    function handlePopState() {
        if (ignoreNextPop) {
            ignoreNextPop = false;
            return;
        }
        if (currentSubpage) {
            hideSubpage();
        }
    }

    // ========================================
    // Hauptseite
    // ========================================

    function renderThemeSegment() {
        const mode = UI.getThemeMode();
        els.themeSegmented.querySelectorAll('[data-theme-mode]').forEach(btn => {
            const active = btn.dataset.themeMode === mode;
            btn.classList.toggle('segmented__item--selected', active);
            btn.setAttribute('aria-checked', active ? 'true' : 'false');
        });
    }

    function handleThemeClick(e) {
        const btn = e.target.closest('[data-theme-mode]');
        if (!btn) return;
        UI.setThemeMode(btn.dataset.themeMode);
        renderThemeSegment();
    }

    function toggleDangerCard(expanded) {
        const open = typeof expanded === 'boolean' ? expanded : !els.dangerCard.classList.contains('danger-card--open');
        els.dangerCard.classList.toggle('danger-card--open', open);
        els.dangerToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    /**
     * Aktualisiert die Verwaltung (z. B. nach Sync oder Tab-Wechsel)
     */
    function refresh() {
        renderThemeSegment();
        if (currentSubpage === 'management-data') {
            renderMasterData();
        } else if (currentSubpage === 'text-snippets') {
            renderSnippets();
        }
    }

    // ========================================
    // Datenverwaltung: Unternehmen & Kategorien
    // ========================================

    function renderRow({ id, name, kind, color }) {
        const escape = Components.escapeHtml;
        return `
            <div class="list-row">
                ${color ? `<button type="button" class="color-bar-btn" data-action="color" data-kind="${kind}" data-id="${id}" aria-label="Farbe ändern" title="Farbe ändern"><span class="color-bar" style="background-color: ${color}"></span></button>` : ''}
                <span class="list-row__title">${escape(name)}</span>
                <button type="button" class="icon-btn" data-action="rename" data-kind="${kind}" data-id="${id}" aria-label="Umbenennen" title="Umbenennen">${Components.icon('edit')}</button>
                <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-kind="${kind}" data-id="${id}" aria-label="Löschen" title="Löschen">${Components.icon('delete')}</button>
            </div>
        `;
    }

    function renderMasterData() {
        const companies = ctx.getCompanies();
        const categories = ctx.getCategories();

        els.companiesList.innerHTML = companies.length
            ? companies.map(c => renderRow({ id: c.id, name: c.name, kind: 'company' })).join('')
            : '<p class="list-card__empty">Keine Unternehmen vorhanden</p>';

        els.categoriesList.innerHTML = categories.length
            ? categories.map(c => renderRow({ id: c.id, name: c.name, kind: 'category', color: UI.categoryColor(c) })).join('')
            : '<p class="list-card__empty">Keine Kategorien vorhanden</p>';
    }

    function listFor(kind) {
        return kind === 'company' ? ctx.getCompanies() : ctx.getCategories();
    }

    /**
     * Dialog mit einem Namensfeld; prüft live auf doppelte Namen
     * @param {Object} options - { title, hint, confirmLabel, initial, takenNames }
     * @returns {Promise<string|null>} getrimmter Name oder null
     */
    function nameDialog({ title, hint = '', confirmLabel, initial = '', takenNames }) {
        const taken = new Set(takenNames.map(n => n.trim().toLowerCase()));

        return Components.showDialog({
            title,
            dismissValue: null,
            body: (close) => {
                const form = document.createElement('form');
                form.className = 'dialog-form';
                form.noValidate = true;
                form.innerHTML = `
                    <div class="form__group">
                        <label class="form__label" for="dialog-name">Name</label>
                        <input type="text" id="dialog-name" class="input" autocomplete="off" autocapitalize="sentences" placeholder="${Components.escapeHtml(hint)}">
                        <p class="field-error" hidden>Dieser Name ist bereits vorhanden</p>
                    </div>
                    <div class="dialog__actions">
                        <button type="button" class="btn btn--text" data-cancel>Abbrechen</button>
                        <button type="submit" class="btn btn--primary">${Components.escapeHtml(confirmLabel)}</button>
                    </div>
                `;

                const input = form.querySelector('input');
                const error = form.querySelector('.field-error');
                const submit = form.querySelector('[type="submit"]');
                input.value = initial;

                function validate() {
                    const value = input.value.trim();
                    const isTaken = value !== '' && taken.has(value.toLowerCase());
                    error.hidden = !isTaken;
                    input.classList.toggle('input--error', isTaken);
                    submit.disabled = value === '' || isTaken;
                    return !submit.disabled;
                }

                input.addEventListener('input', validate);
                form.querySelector('[data-cancel]').addEventListener('click', () => close(null));
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (validate()) close(input.value.trim());
                });

                validate();
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 50);
                return form;
            }
        });
    }

    async function addItem(kind) {
        const isCompany = kind === 'company';
        const name = await nameDialog({
            title: isCompany ? 'Unternehmen hinzufügen' : 'Kategorie hinzufügen',
            hint: isCompany ? 'z. B. Musterfirma GmbH' : 'z. B. Meetings',
            confirmLabel: 'Hinzufügen',
            takenNames: listFor(kind).map(item => item.name)
        });
        if (!name) return;

        try {
            if (isCompany) {
                await DB.addCompany({ name });
            } else {
                await DB.addCategory({ name });
            }
            await ctx.reloadData();
            renderMasterData();
            UI.showToast(isCompany ? 'Unternehmen hinzugefügt' : 'Kategorie hinzugefügt', 'success');
        } catch (error) {
            console.error('Fehler beim Hinzufügen:', error);
            UI.showToast('Fehler beim Speichern', 'error');
        }
    }

    async function renameItem(kind, id) {
        const isCompany = kind === 'company';
        const item = listFor(kind).find(i => i.id === id);
        if (!item) return;

        const name = await nameDialog({
            title: isCompany ? 'Unternehmen umbenennen' : 'Kategorie umbenennen',
            confirmLabel: 'Umbenennen',
            initial: item.name,
            takenNames: listFor(kind).filter(i => i.id !== id).map(i => i.name)
        });
        if (!name || name === item.name) return;

        try {
            if (isCompany) {
                await DB.updateCompany({ ...item, name });
            } else {
                await DB.updateCategory({ ...item, name });
            }
            await ctx.reloadData();
            renderMasterData();
            UI.showToast('Erfolgreich umbenannt', 'success');
        } catch (error) {
            console.error('Fehler beim Umbenennen:', error);
            UI.showToast('Fehler beim Speichern', 'error');
        }
    }

    async function deleteItem(kind, id) {
        const item = listFor(kind).find(i => i.id === id);
        if (!item) return;

        const count = kind === 'company'
            ? await DB.countEntriesForCompany(id)
            : await DB.countEntriesForCategory(id);
        const countText = count > 0 ? ` (${count} ${count === 1 ? 'Eintrag' : 'Einträge'})` : '';

        const confirmed = await Components.confirm({
            title: 'Löschen bestätigen',
            text: `Möchten Sie "${item.name}"${countText} wirklich löschen? Bestehende Zeiteinträge bleiben erhalten.`
        });
        if (!confirmed) return;

        try {
            await ctx.deleteRecord(kind, id);
            renderMasterData();
            UI.showToast('Erfolgreich gelöscht', 'success');
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            UI.showToast('Fehler beim Löschen', 'error');
        }
    }

    /**
     * Dialog "Farbe wählen": 15 Swatches, ein Tipp übernimmt sofort
     */
    async function changeColor(id) {
        const category = ctx.getCategories().find(c => c.id === id);
        if (!category) return;
        const current = Number.isInteger(category.colorIndex) ? category.colorIndex : 0;

        // Höchstens 5 Spalten, weniger wenn der Bildschirm zu schmal ist
        let columns = 5;
        while (columns > 1 && columns * 48 + (columns - 1) * 8 > window.innerWidth - 128) {
            columns--;
        }

        const picked = await Components.showDialog({
            title: 'Farbe wählen',
            dismissValue: null,
            body: (close) => {
                const grid = document.createElement('div');
                grid.className = 'swatch-grid';
                grid.style.gridTemplateColumns = `repeat(${columns}, 48px)`;
                grid.innerHTML = UI.CATEGORY_COLORS.map((color, index) =>
                    `<button type="button" class="swatch${index === current ? ' swatch--selected' : ''}" data-index="${index}" style="background-color: ${color}" aria-label="Farbe ${index + 1}"></button>`
                ).join('');
                grid.addEventListener('click', (e) => {
                    const swatch = e.target.closest('[data-index]');
                    if (swatch) close(Number(swatch.dataset.index));
                });
                return grid;
            }
        });

        if (picked === null || picked === current) return;

        try {
            await DB.updateCategory({ ...category, colorIndex: picked });
            await ctx.reloadData();
            renderMasterData();
            UI.showToast('Farbe geändert', 'success');
        } catch (error) {
            console.error('Fehler beim Ändern der Farbe:', error);
            UI.showToast('Fehler beim Speichern', 'error');
        }
    }

    function handleMasterDataClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, kind, id } = btn.dataset;
        if (action === 'rename') renameItem(kind, id);
        else if (action === 'delete') deleteItem(kind, id);
        else if (action === 'color') changeColor(id);
    }

    // ========================================
    // Textbausteine
    // ========================================

    let snippets = [];

    async function renderSnippets() {
        try {
            snippets = await DB.getTextSnippets();
        } catch (error) {
            console.error('Fehler beim Laden der Textbausteine:', error);
            snippets = [];
        }

        const escape = Components.escapeHtml;
        els.snippetsList.innerHTML = snippets.length
            ? snippets.map(s => `
                <div class="list-row list-row--clickable" data-action="edit" data-id="${s.id}">
                    <span class="list-row__title list-row__title--clamp">${escape(s.content)}</span>
                    <button type="button" class="icon-btn" data-action="edit" data-id="${s.id}" aria-label="Bearbeiten" title="Bearbeiten">${Components.icon('edit')}</button>
                    <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-id="${s.id}" aria-label="Löschen" title="Löschen">${Components.icon('delete')}</button>
                </div>
            `).join('')
            : '<p class="list-card__empty">Keine Textbausteine vorhanden</p>';
    }

    /**
     * Dialog zum Anlegen/Bearbeiten eines Textbausteins
     * @returns {Promise<string|null>} getrimmter Text oder null
     */
    function snippetDialog({ title, confirmLabel, initial = '' }) {
        return Components.showDialog({
            title,
            dismissValue: null,
            body: (close) => {
                const form = document.createElement('form');
                form.className = 'dialog-form';
                form.noValidate = true;
                form.innerHTML = `
                    <div class="form__group">
                        <label class="form__label" for="dialog-snippet">Text</label>
                        <textarea id="dialog-snippet" class="textarea textarea--auto" rows="3" autocapitalize="sentences" placeholder="z. B. Daily Stand-up"></textarea>
                    </div>
                    <div class="dialog__actions">
                        <button type="button" class="btn btn--text" data-cancel>Abbrechen</button>
                        <button type="submit" class="btn btn--primary">${Components.escapeHtml(confirmLabel)}</button>
                    </div>
                `;

                const textarea = form.querySelector('textarea');
                const submit = form.querySelector('[type="submit"]');
                textarea.value = initial;

                function update() {
                    submit.disabled = textarea.value.trim() === '';
                    // Wächst mit dem Inhalt bis max. 6 Zeilen (per CSS max-height)
                    textarea.style.height = 'auto';
                    textarea.style.height = `${textarea.scrollHeight + 2}px`;
                }

                textarea.addEventListener('input', update);
                form.querySelector('[data-cancel]').addEventListener('click', () => close(null));
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (!submit.disabled) close(textarea.value.trim());
                });

                setTimeout(() => {
                    update();
                    textarea.focus();
                }, 50);
                return form;
            }
        });
    }

    async function addSnippet() {
        const content = await snippetDialog({ title: 'Textbaustein hinzufügen', confirmLabel: 'Hinzufügen' });
        if (!content) return;

        try {
            await DB.addTextSnippet({ content });
            await renderSnippets();
            UI.showToast('Textbaustein hinzugefügt', 'success');
        } catch (error) {
            console.error('Fehler beim Speichern des Textbausteins:', error);
            UI.showToast('Fehler beim Speichern', 'error');
        }
    }

    async function editSnippet(id) {
        const snippet = snippets.find(s => s.id === id);
        if (!snippet) return;

        const content = await snippetDialog({
            title: 'Textbaustein bearbeiten',
            confirmLabel: 'Speichern',
            initial: snippet.content
        });
        if (!content || content === snippet.content) return;

        try {
            await DB.updateTextSnippet({ ...snippet, content });
            await renderSnippets();
            UI.showToast('Textbaustein aktualisiert', 'success');
        } catch (error) {
            console.error('Fehler beim Speichern des Textbausteins:', error);
            UI.showToast('Fehler beim Speichern', 'error');
        }
    }

    async function deleteSnippet(id) {
        const confirmed = await Components.confirm({
            title: 'Löschen bestätigen',
            text: 'Möchten Sie diesen Textbaustein wirklich löschen?'
        });
        if (!confirmed) return;

        try {
            await ctx.deleteRecord('snippet', id);
            await renderSnippets();
            UI.showToast('Erfolgreich gelöscht', 'success');
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            UI.showToast('Fehler beim Löschen', 'error');
        }
    }

    function handleSnippetsClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        if (target.dataset.action === 'delete') {
            deleteSnippet(target.dataset.id);
        } else {
            editSnippet(target.dataset.id);
        }
    }

    // ========================================
    // Export
    // ========================================

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function isoDate(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    /**
     * Speichert eine Datei: mit Speichern-Dialog, wo der Browser ihn anbietet
     * (Desktop-Chrome/Edge), sonst als Download.
     * @returns {Promise<boolean>} false, wenn der Nutzer abgebrochen hat
     */
    async function saveFile(content, filename, mimeType, description, extension) {
        const blob = new Blob([content], { type: mimeType });

        if (typeof window.showSaveFilePicker === 'function') {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{ description, accept: { [mimeType.split(';')[0]]: [extension] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return true;
            } catch (error) {
                if (error.name === 'AbortError') return false;
                // z. B. SecurityError in eingebetteten Ansichten: auf Download ausweichen
                console.warn('Speichern-Dialog nicht verfügbar, nutze Download:', error);
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }

    async function handleExportClick() {
        const format = await Components.showDialog({
            title: 'Export-Format wählen',
            text: 'In welchem Format möchten Sie Ihre Daten exportieren?',
            stacked: true,
            buttons: [
                { label: 'Als JSON exportieren', value: 'json', icon: 'description' },
                { label: 'Als CSV exportieren', value: 'csv', icon: 'tableChart' },
                { label: 'Abbrechen', value: null, variant: 'outlined' }
            ]
        });

        if (format === 'json') {
            exportJson();
        } else if (format === 'csv') {
            const filter = await openCsvSheet();
            if (filter) exportCsv(filter);
        }
    }

    async function exportJson() {
        try {
            // Interne Sync-Metadaten gehören nicht ins Backup
            const stripSync = ({ syncState, syncedAt, ...rest }) => rest;
            const data = Object.fromEntries(
                Object.entries(await DB.getAllData()).map(([key, items]) => [key, items.map(stripSync)])
            );
            const json = JSON.stringify({
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                data
            }, null, 2);

            const saved = await saveFile(json, `timetrack-export-${isoDate(new Date())}.json`,
                'application/json', 'TimeTrack-Backup', '.json');
            if (!saved) return;

            const total = data.companies.length + data.categories.length +
                data.timeEntries.length + data.textSnippets.length;
            UI.showToast(`${total} Einträge exportiert`, 'success');
        } catch (error) {
            console.error('Fehler beim JSON-Export:', error);
            UI.showToast('Export fehlgeschlagen', 'error');
        }
    }

    // ---------- CSV ----------

    const CSV_RANGES = [
        { value: 'all', label: 'Gesamter Zeitraum' },
        { value: 'thisMonth', label: 'Dieser Monat' },
        { value: 'lastMonth', label: 'Letzter Monat' },
        { value: 'thisYear', label: 'Dieses Jahr' },
        { value: 'custom', label: 'Benutzerdefiniert' }
    ];

    /**
     * Zeitraum [start, end) in lokaler Zeit oder null für "Gesamter Zeitraum"
     * @param {Object} filter - { range, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
     */
    function csvRange(filter) {
        const now = new Date();
        switch (filter.range) {
            case 'thisMonth':
                return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
            case 'lastMonth':
                return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
            case 'thisYear':
                return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
            case 'custom': {
                if (!filter.from || !filter.to) return { start: new Date(0), end: new Date(0) };
                const [fy, fm, fd] = filter.from.split('-').map(Number);
                const [ty, tm, td] = filter.to.split('-').map(Number);
                return { start: new Date(fy, fm - 1, fd), end: new Date(ty, tm - 1, td + 1) };
            }
            default:
                return null;
        }
    }

    /**
     * Filtert Einträge nach Zeitraum (Startzeit), Unternehmen und Kategorie
     */
    function filterCsvEntries(entries, filter) {
        const range = csvRange(filter);
        return entries.filter(e =>
            (!range || (e.startTime >= range.start.getTime() && e.startTime < range.end.getTime())) &&
            (!filter.companyId || e.companyId === filter.companyId) &&
            (!filter.categoryId || e.categoryId === filter.categoryId)
        );
    }

    /**
     * Name für Dateinamen: Kleinbuchstaben, Umlaute ersetzt, Sonderzeichen → "-"
     */
    function slugify(name) {
        return name.toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function csvFilename(filter) {
        const now = new Date();
        let suffix;
        switch (filter.range) {
            case 'thisMonth':
                suffix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
                break;
            case 'lastMonth': {
                const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                suffix = `${last.getFullYear()}-${pad(last.getMonth() + 1)}`;
                break;
            }
            case 'thisYear':
                suffix = `${now.getFullYear()}`;
                break;
            case 'custom':
                suffix = `${filter.from}_${filter.to}`;
                break;
            default:
                suffix = isoDate(now);
        }

        const parts = [suffix];
        const company = filter.companyId && ctx.getCompanies().find(c => c.id === filter.companyId);
        const category = filter.categoryId && ctx.getCategories().find(c => c.id === filter.categoryId);
        if (company) parts.push(slugify(company.name));
        if (category) parts.push(slugify(category.name));

        return `timetrack-export-${parts.filter(Boolean).join('-')}.csv`;
    }

    /**
     * CSV-Zelle: Schutz vor Formel-Injection ('-Präfix) und Quoting bei ; " oder Zeilenumbruch
     */
    function csvCell(value) {
        let str = value === null || value === undefined ? '' : String(value);
        if (/^[=+\-@\t\r]/.test(str)) {
            str = `'${str}`;
        }
        if (/[;"\r\n]/.test(str)) {
            str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    function buildCsv(entries) {
        const companyMap = new Map(ctx.getCompanies().map(c => [c.id, c.name]));
        const categoryMap = new Map(ctx.getCategories().map(c => [c.id, c.name]));
        const time = (ts) => {
            const d = new Date(ts);
            return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        const date = (ts) => {
            const d = new Date(ts);
            return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
        };

        // Spalte "Pause" gibt es nur in der PWA (Ende − Start − Dauer, nie negativ)
        const rows = [['Datum', 'Start', 'Ende', 'Pause', 'Dauer', 'Unternehmen', 'Kategorie', 'Notiz'].join(';')];
        [...entries]
            .sort((a, b) => b.startTime - a.startTime)
            .forEach(entry => {
                rows.push([
                    date(entry.startTime),
                    time(entry.startTime),
                    time(entry.endTime),
                    Utils.formatTime(Math.max(0, entry.endTime - entry.startTime - entry.duration)).formatted,
                    Utils.formatTime(entry.duration).formatted,
                    csvCell(companyMap.get(entry.companyId) || 'Unbekannt'),
                    csvCell(entry.categoryId ? categoryMap.get(entry.categoryId) || '' : ''),
                    csvCell(entry.note || '')
                ].join(';'));
            });

        // BOM für UTF-8 in Excel
        return '﻿' + rows.join('\r\n');
    }

    /**
     * Sheet "CSV exportieren"
     * @returns {Promise<Object|null>} Filter oder null bei Abbruch
     */
    async function openCsvSheet() {
        let allEntries = [];
        try {
            allEntries = await DB.getTimeEntries({});
        } catch (error) {
            console.error('Fehler beim Laden der Einträge:', error);
        }

        const today = new Date();
        const filter = {
            range: 'all',
            from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
            to: isoDate(today),
            companyId: null,
            categoryId: null
        };

        return Components.showSheet({
            title: 'CSV exportieren',
            body: (close) => {
                const root = document.createElement('div');
                root.className = 'form';
                root.innerHTML = `
                    <div class="form__group">
                        <span class="form__label">Zeitraum</span>
                        <div data-csv="range"></div>
                    </div>
                    <div class="form__row" data-csv="custom" hidden>
                        <div class="form__group">
                            <label class="form__label" for="csv-from">Von</label>
                            <input type="date" id="csv-from" class="input" min="2000-01-01">
                        </div>
                        <div class="form__group">
                            <label class="form__label" for="csv-to">Bis</label>
                            <input type="date" id="csv-to" class="input" min="2000-01-01">
                        </div>
                    </div>
                    <div class="form__group">
                        <span class="form__label">Unternehmen</span>
                        <div data-csv="company"></div>
                    </div>
                    <div class="form__group">
                        <span class="form__label">Kategorie</span>
                        <div data-csv="category"></div>
                    </div>
                    <p class="csv-preview" data-csv="preview"></p>
                    <div class="sheet__actions">
                        <button type="button" class="btn btn--outlined" data-csv="cancel">Abbrechen</button>
                        <button type="button" class="btn btn--primary" data-csv="export">${Components.icon('upload')}<span>Exportieren</span></button>
                    </div>
                `;

                const customRow = root.querySelector('[data-csv="custom"]');
                const fromInput = root.querySelector('#csv-from');
                const toInput = root.querySelector('#csv-to');
                const preview = root.querySelector('[data-csv="preview"]');
                const exportBtn = root.querySelector('[data-csv="export"]');
                fromInput.value = filter.from;
                toInput.value = filter.to;

                function update() {
                    customRow.hidden = filter.range !== 'custom';
                    const count = filterCsvEntries(allEntries, filter).length;
                    preview.textContent = count === 1
                        ? '1 Zeiteintrag wird exportiert'
                        : `${count} Zeiteinträge werden exportiert`;
                    exportBtn.disabled = count === 0;
                }

                const rangeDropdown = Components.createDropdown(root.querySelector('[data-csv="range"]'), {
                    variant: 'outlined',
                    ariaLabel: 'Zeitraum',
                    onChange: (value) => {
                        filter.range = value;
                        update();
                    }
                });
                rangeDropdown.setOptions(CSV_RANGES);
                rangeDropdown.setValue(filter.range);

                const companyDropdown = Components.createDropdown(root.querySelector('[data-csv="company"]'), {
                    variant: 'outlined',
                    ariaLabel: 'Unternehmen',
                    onChange: (value) => {
                        filter.companyId = value || null;
                        update();
                    }
                });
                companyDropdown.setOptions([
                    { value: '', label: 'Alle Unternehmen' },
                    ...ctx.getCompanies().map(c => ({ value: c.id, label: c.name }))
                ]);
                companyDropdown.setValue('');

                const categoryDropdown = Components.createDropdown(root.querySelector('[data-csv="category"]'), {
                    variant: 'outlined',
                    ariaLabel: 'Kategorie',
                    onChange: (value) => {
                        filter.categoryId = value || null;
                        update();
                    }
                });
                categoryDropdown.setOptions([
                    { value: '', label: 'Alle Kategorien' },
                    ...ctx.getCategories().map(c => ({ value: c.id, label: c.name }))
                ]);
                categoryDropdown.setValue('');

                [fromInput, toInput].forEach(input => {
                    input.addEventListener('change', () => {
                        filter.from = fromInput.value;
                        filter.to = toInput.value;
                        // "Bis" darf nicht vor "Von" liegen
                        if (filter.from && filter.to && filter.to < filter.from) {
                            filter.to = filter.from;
                            toInput.value = filter.from;
                        }
                        update();
                    });
                });

                root.querySelector('[data-csv="cancel"]').addEventListener('click', () => close(null));
                exportBtn.addEventListener('click', () => close({ ...filter, entries: filterCsvEntries(allEntries, filter) }));

                update();
                return root;
            }
        });
    }

    async function exportCsv(filter) {
        try {
            const saved = await saveFile(buildCsv(filter.entries), csvFilename(filter),
                'text/csv;charset=utf-8', 'CSV-Datei', '.csv');
            if (!saved) return;
            UI.showToast(`${filter.entries.length} Zeiteinträge exportiert`, 'success');
        } catch (error) {
            console.error('Fehler beim CSV-Export:', error);
            UI.showToast('Export fehlgeschlagen', 'error');
        }
    }

    // ========================================
    // Import
    // ========================================

    /**
     * Prüft die Grundstruktur einer TimeTrack-Exportdatei
     * @returns {string|null} Fehlermeldung oder null
     */
    function validateImportData(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return 'Ungültiges Datenformat';
        }
        if (!data.version || !data.data || typeof data.data !== 'object') {
            return 'Keine gültige TimeTrack-Exportdatei';
        }
        for (const key of ['companies', 'categories', 'timeEntries', 'textSnippets']) {
            if (data.data[key] !== undefined && !Array.isArray(data.data[key])) {
                return `Ungültiges Format: ${key} muss ein Array sein`;
            }
        }
        return null;
    }

    /**
     * Verwirft ungültige Datensätze und ergänzt fehlende Felder (wie die Flutter-App)
     */
    function sanitizeImportData(data) {
        const now = Date.now();
        const isNonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
        const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

        const companies = (data.companies || [])
            .filter(c => c && isNonEmpty(c.id) && isNonEmpty(c.name))
            .map(c => ({
                id: c.id,
                name: c.name,
                createdAt: isNumber(c.createdAt) ? c.createdAt : now,
                updatedAt: isNumber(c.updatedAt) ? c.updatedAt : now
            }));

        const categories = (data.categories || [])
            .filter(c => c && isNonEmpty(c.id) && isNonEmpty(c.name))
            .map(c => ({ ...c, createdAt: isNumber(c.createdAt) ? c.createdAt : now }))
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((c, index) => ({
                id: c.id,
                name: c.name,
                colorIndex: (Number.isInteger(c.colorIndex) ? c.colorIndex : index % 8) % UI.CATEGORY_COLORS.length,
                createdAt: c.createdAt,
                updatedAt: isNumber(c.updatedAt) ? c.updatedAt : now
            }));

        // Zeitstempel müssen plausibel sein (sonst scheitert später der Cloud-Sync)
        const isTimestamp = (v) => isNumber(v) && v >= MIN_IMPORT_TIMESTAMP && v <= MAX_IMPORT_TIMESTAMP;
        // Dauer: ganze ms, > 0 und höchstens die Zeitspanne (fehlend → ganze Spanne)
        const durationOf = (e) => {
            const span = e.endTime - e.startTime;
            if (!isNumber(e.duration)) return span;
            const duration = Math.round(e.duration);
            return duration > 0 && duration <= span ? duration : null;
        };

        const timeEntries = (data.timeEntries || [])
            .filter(e => e && isNonEmpty(e.id) && isNonEmpty(e.companyId) &&
                isTimestamp(e.startTime) && isTimestamp(e.endTime) && e.endTime > e.startTime &&
                durationOf(e) !== null)
            .map(e => ({
                id: e.id,
                companyId: e.companyId,
                categoryId: isNonEmpty(e.categoryId) ? e.categoryId : null,
                date: new Date(e.startTime).setHours(0, 0, 0, 0),
                startTime: Math.round(e.startTime),
                endTime: Math.round(e.endTime),
                duration: durationOf(e),
                note: isNonEmpty(e.note) ? e.note : null,
                createdAt: isTimestamp(e.createdAt) ? Math.round(e.createdAt) : Math.round(e.startTime),
                updatedAt: isTimestamp(e.updatedAt) ? Math.round(e.updatedAt) : Math.round(e.startTime)
            }));

        const textSnippets = (data.textSnippets || [])
            .filter(s => s && isNonEmpty(s.id) && isNonEmpty(s.content))
            .map(s => ({
                id: s.id,
                content: s.content.trim(),
                createdAt: isNumber(s.createdAt) ? s.createdAt : now,
                updatedAt: isNumber(s.updatedAt) ? s.updatedAt : now
            }));

        return { companies, categories, timeEntries, textSnippets };
    }

    function isValidUuid(id) {
        return typeof id === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }

    /**
     * Leitet aus einer veralteten ID eine feste UUID (v5-Format) ab, damit
     * wiederholte Importe derselben Datei keine Duplikate erzeugen
     * @param {string} type - Store-Name (verhindert Kollisionen zwischen Typen)
     * @param {string} legacyId
     * @returns {Promise<string>}
     */
    async function legacyIdToUuid(type, legacyId) {
        const input = new TextEncoder().encode(`timetrack-legacy:${type}:${legacyId}`);
        const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', input)).slice(0, 16);
        bytes[6] = (bytes[6] & 0x0f) | 0x50; // Version 5
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variante RFC 4122
        const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    /**
     * Ersetzt veraltete (nicht-UUID) IDs durch abgeleitete UUIDs inkl. Referenzen
     * @returns {Promise<Object>} { data, wasMigrated }
     */
    async function migrateLegacyIds(data) {
        let wasMigrated = false;

        const toUuid = async (type, id) => {
            if (!id || isValidUuid(id)) return id;
            wasMigrated = true;
            return legacyIdToUuid(type, id);
        };
        const migrateAll = (type, items) =>
            Promise.all(items.map(async item => ({ ...item, id: await toUuid(type, item.id) })));

        const companies = await migrateAll('companies', data.companies);
        const categories = await migrateAll('categories', data.categories);
        const textSnippets = await migrateAll('textSnippets', data.textSnippets);
        const timeEntries = await Promise.all(data.timeEntries.map(async entry => ({
            ...entry,
            id: await toUuid('timeEntries', entry.id),
            companyId: await toUuid('companies', entry.companyId),
            categoryId: entry.categoryId ? await toUuid('categories', entry.categoryId) : null
        })));

        return { data: { companies, categories, timeEntries, textSnippets }, wasMigrated };
    }

    async function handleImportFileSelected(event) {
        const file = event.target.files[0];
        event.target.value = '';
        if (!file) return;

        if (file.size > MAX_IMPORT_BYTES) {
            UI.showToast('Die Datei ist zu groß (max. 20 MB)', 'error');
            return;
        }
        if (!file.name.toLowerCase().endsWith('.json')) {
            UI.showToast('Nur JSON-Dateien werden unterstützt', 'error');
            return;
        }

        try {
            let parsed;
            try {
                parsed = JSON.parse(await file.text());
            } catch (error) {
                UI.showToast('Ungültige JSON-Datei', 'error');
                return;
            }

            const validationError = validateImportData(parsed);
            if (validationError) {
                UI.showToast(validationError, 'error');
                return;
            }

            const sanitized = sanitizeImportData(parsed.data);
            const rejectedEntries = (parsed.data.timeEntries || []).length - sanitized.timeEntries.length;
            const { data, wasMigrated } = await migrateLegacyIds(sanitized);
            const stats = await DB.importData(data);
            await ctx.reloadData();

            // Einträge/Auswertung auf den neuesten importierten Eintrag setzen
            const newest = data.timeEntries.reduce((max, e) => (!max || e.startTime > max.startTime ? e : max), null);
            if (newest) {
                EntriesView.setDate(new Date(newest.startTime));
                AnalysisView.setDate(new Date(newest.startTime));
            }
            ctx.refreshViews();

            const parts = [];
            const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
            if (stats.companiesAdded > 0) parts.push(count(stats.companiesAdded, 'Unternehmen', 'Unternehmen'));
            if (stats.categoriesAdded > 0) parts.push(count(stats.categoriesAdded, 'Kategorie', 'Kategorien'));
            if (stats.entriesAdded > 0) parts.push(count(stats.entriesAdded, 'Eintrag', 'Einträge'));
            if (stats.snippetsAdded > 0) parts.push(count(stats.snippetsAdded, 'Textbaustein', 'Textbausteine'));

            const rejectedNote = rejectedEntries > 0
                ? `\n${count(rejectedEntries, 'ungültiger Eintrag wurde', 'ungültige Einträge wurden')} übersprungen`
                : '';

            if (parts.length === 0) {
                UI.showToast('Keine neuen Daten importiert (alle bereits vorhanden)' + rejectedNote, 'info', 4000);
            } else {
                let message = `Import erfolgreich: ${parts.join(', ')}`;
                if (wasMigrated) message += '\nVeraltete IDs wurden automatisch konvertiert';
                UI.showToast(message + rejectedNote, 'success', 4000);
            }
        } catch (error) {
            console.error('Fehler beim Import:', error);
            UI.showToast('Import fehlgeschlagen', 'error');
        }
    }

    // ========================================
    // Alle Daten löschen
    // ========================================

    async function handleDeleteAllClick() {
        const cloudMode = Auth.isCloudMode();

        const scope = await Components.showDialog({
            title: 'Alle Daten löschen?',
            titleClassName: 'dialog__title--danger',
            dismissValue: null,
            body: (close) => {
                const form = document.createElement('form');
                form.className = 'dialog-form';
                form.noValidate = true;
                form.innerHTML = `
                    <p class="dialog__text">Diese Aktion kann nicht rückgängig gemacht werden! Alle Unternehmen, Kategorien, Zeiteinträge und Textbausteine werden unwiderruflich gelöscht.</p>
                    ${cloudMode ? `
                        <div class="form__group">
                            <span class="form__label">Was soll gelöscht werden?</span>
                            <div class="radio-group">
                                <label class="radio-option"><input type="radio" name="delete-scope" value="local" checked><span>Nur lokale Daten</span></label>
                                <label class="radio-option"><input type="radio" name="delete-scope" value="both"><span>Lokal und Cloud</span></label>
                            </div>
                        </div>
                    ` : ''}
                    <div class="form__group">
                        <label class="form__label" for="delete-confirmation-input">Geben Sie DELETE ein, um zu bestätigen:</label>
                        <input type="text" id="delete-confirmation-input" class="input input--uppercase" placeholder="DELETE" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false">
                    </div>
                    <div class="dialog__actions">
                        <button type="button" class="btn btn--text" data-cancel>Abbrechen</button>
                        <button type="submit" class="btn btn--destructive" disabled>Unwiderruflich löschen</button>
                    </div>
                `;

                const input = form.querySelector('#delete-confirmation-input');
                const submit = form.querySelector('[type="submit"]');

                input.addEventListener('input', () => {
                    input.value = input.value.toUpperCase();
                    submit.disabled = input.value.trim() !== 'DELETE';
                });
                form.querySelector('[data-cancel]').addEventListener('click', () => close(null));
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    if (submit.disabled) return;
                    const checked = form.querySelector('input[name="delete-scope"]:checked');
                    close(checked ? checked.value : 'local');
                });

                setTimeout(() => input.focus(), 50);
                return form;
            }
        });

        if (!scope) return;

        try {
            await DB.deleteAllData();

            // Nur lokal: Sync-Queue leeren, damit keine Pending-Deletes in die Cloud gehen
            if (scope !== 'both') {
                await DB.clearSyncQueue();
            }

            let cloudFailed = false;
            if (scope === 'both' && Auth.isCloudMode()) {
                const result = await SupabaseClient.hardDeleteAllUserData();
                if (!result.success) {
                    console.error('Fehler beim Löschen der Cloud-Daten:', result.error);
                    cloudFailed = true;
                }
            }

            await ctx.reloadData();
            ctx.refreshViews();
            toggleDangerCard(false);

            if (cloudFailed) {
                UI.showToast('Lokale Daten gelöscht, Cloud-Fehler', 'error');
            } else {
                UI.showToast(scope === 'both'
                    ? 'Alle Daten wurden lokal und in der Cloud gelöscht'
                    : 'Alle Daten wurden gelöscht', 'success');
            }
        } catch (error) {
            console.error('Fehler beim Löschen aller Daten:', error);
            UI.showToast('Fehler beim Löschen', 'error');
        }
    }

    // ========================================
    // Initialisierung
    // ========================================

    /**
     * @param {Object} context - { getCompanies, getCategories, reloadData, deleteRecord, refreshViews }
     */
    function init(context) {
        ctx = context;

        els.app = document.getElementById('app');
        els.management = document.getElementById('view-management');
        els.themeSegmented = document.getElementById('theme-segmented');
        els.dangerCard = document.getElementById('danger-card');
        els.dangerToggle = els.dangerCard.querySelector('.danger-card__toggle');
        els.companiesList = document.getElementById('companies-list');
        els.categoriesList = document.getElementById('categories-list');
        els.snippetsList = document.getElementById('snippets-list');
        els.fileInput = document.getElementById('file-import-input');

        document.getElementById('app-version').textContent = `Version ${Config.APP_VERSION}`;

        els.themeSegmented.addEventListener('click', handleThemeClick);
        els.dangerToggle.addEventListener('click', () => toggleDangerCard());

        document.querySelectorAll('[data-open-subpage]').forEach(btn => {
            btn.addEventListener('click', () => openSubpage(btn.dataset.openSubpage));
        });
        document.querySelectorAll('[data-subpage-back]').forEach(btn => {
            btn.addEventListener('click', closeSubpage);
        });
        window.addEventListener('popstate', handlePopState);

        document.getElementById('btn-add-company').addEventListener('click', () => addItem('company'));
        document.getElementById('btn-add-category').addEventListener('click', () => addItem('category'));
        els.companiesList.addEventListener('click', handleMasterDataClick);
        els.categoriesList.addEventListener('click', handleMasterDataClick);

        document.getElementById('btn-add-snippet').addEventListener('click', addSnippet);
        els.snippetsList.addEventListener('click', handleSnippetsClick);

        document.getElementById('btn-import').addEventListener('click', () => els.fileInput.click());
        els.fileInput.addEventListener('change', handleImportFileSelected);
        document.getElementById('btn-export').addEventListener('click', handleExportClick);
        document.getElementById('btn-delete-all').addEventListener('click', handleDeleteAllClick);

        renderThemeSegment();
    }

    // Öffentliche API
    return {
        init,
        refresh,
        openSubpage,
        closeSubpage,
        isSubpageOpen
    };
})();
