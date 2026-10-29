/**
 * TimeTrack PWA - Entries View
 * Seite "Einträge": Filter, Liste nach Tagen, Bearbeiten-Sheet, Löschen
 */

const EntriesView = (function() {
    'use strict';

    // Kontext der App: { getCompanies, getCategories, reloadData, deleteRecord }
    let ctx = null;

    const els = {};
    let filter = null;

    // Bearbeiten-Sheet
    let editing = null; // { original, pauseMs }
    let editCompany = null;
    let editCategory = null;
    let editNoteField = null;
    let saving = false;

    // ========================================
    // Liste
    // ========================================

    /**
     * Lädt die Einträge für den aktuellen Filter und rendert die Liste
     */
    async function refresh() {
        const companies = ctx.getCompanies();
        const categories = ctx.getCategories();
        filter.setLists(companies, categories);

        const state = filter.getState();
        try {
            const entries = await DB.getTimeEntries({
                companyId: state.companyId,
                dateRange: filter.getDateRange()
            });
            render(filter.filterByCategory(entries, categories), companies, categories);
        } catch (error) {
            console.error('Fehler beim Laden der Einträge:', error);
            els.list.innerHTML = Components.emptyState('error', 'Fehler beim Laden der Daten');
        }
    }

    /**
     * Rendert die Einträge gruppiert nach Tag (neueste zuerst)
     */
    function render(entries, companies, categories) {
        if (entries.length === 0) {
            els.list.innerHTML = Components.emptyState('eventNote', 'Keine Einträge gefunden');
            return;
        }

        const companyMap = new Map(companies.map(c => [c.id, c]));
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const groups = Utils.groupEntriesByDate(entries);

        els.list.innerHTML = Object.values(groups).map(group => `
            <section class="date-group">
                <h3 class="date-group__header">${Components.escapeHtml(Utils.formatDate(group.date, 'weekday'))}</h3>
                ${group.entries.map(entry => renderCard(entry, companyMap, categoryMap)).join('')}
            </section>
        `).join('');
    }

    function renderCard(entry, companyMap, categoryMap) {
        const company = companyMap.get(entry.companyId);
        const category = entry.categoryId ? categoryMap.get(entry.categoryId) : null;
        const escape = Components.escapeHtml;

        return `
            <article class="entry-card">
                <div class="entry-card__content">
                    <span class="entry-card__company">${escape(company ? company.name : 'Unbekannt')}</span>
                    <div class="entry-card__meta">
                        <span class="entry-card__time">${Utils.formatTimeOfDay(entry.startTime)} – ${Utils.formatTimeOfDay(entry.endTime)}</span>
                        ${category ? `<span class="category-badge" style="background-color: ${UI.categoryColor(category)}">${escape(category.name)}</span>` : ''}
                    </div>
                    ${entry.note ? `<p class="entry-card__note">${escape(entry.note)}</p>` : ''}
                </div>
                <div class="entry-card__right">
                    <span class="entry-card__duration">${Utils.formatTime(entry.duration).formatted}</span>
                    <div class="entry-card__actions">
                        <button type="button" class="entry-card__btn entry-card__btn--edit" data-action="edit" data-id="${entry.id}" aria-label="Bearbeiten" title="Bearbeiten">${Components.icon('edit')}</button>
                        <button type="button" class="entry-card__btn entry-card__btn--delete" data-action="delete" data-id="${entry.id}" aria-label="Löschen" title="Löschen">${Components.icon('delete')}</button>
                    </div>
                </div>
            </article>
        `;
    }

    async function handleListClick(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        if (btn.dataset.action === 'edit') {
            try {
                const entry = await DB.getTimeEntry(btn.dataset.id);
                if (entry) openEditSheet(entry);
            } catch (error) {
                console.error('Fehler beim Laden des Eintrags:', error);
                UI.showToast('Fehler beim Laden der Daten', 'error');
            }
        } else if (btn.dataset.action === 'delete') {
            handleDelete(btn.dataset.id);
        }
    }

    async function handleDelete(id) {
        const confirmed = await Components.confirm({
            title: 'Löschen bestätigen',
            text: 'Möchten Sie diesen Zeiteintrag wirklich löschen?'
        });
        if (!confirmed) return;

        try {
            await ctx.deleteRecord('entry', id);
            await refresh();
            UI.showToast('Erfolgreich gelöscht', 'success');
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            UI.showToast('Fehler beim Löschen', 'error');
        }
    }

    // ========================================
    // Bearbeiten (Regeln wie applyEntryEdit in der Flutter-App)
    // ========================================

    /**
     * Pause eines Eintrags: (Ende - Start) - Dauer, nie negativ
     * @param {Object} entry
     * @returns {number} ms
     */
    function pauseOf(entry) {
        return Math.max(0, (entry.endTime - entry.startTime) - entry.duration);
    }

    /**
     * Formatiert ms als HH:MM (für Pause)
     */
    function msToClock(ms) {
        const totalMinutes = Math.floor(ms / 60000);
        return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
    }

    /**
     * Wendet die Formularwerte auf den Originaleintrag an.
     * Unveränderte Uhrzeiten behalten die Original-Zeitstempel (inkl. Sekunden,
     * auf das neue Datum verschoben); bei unveränderter Pause bleibt die Dauer.
     * @param {Object} original
     * @param {Object} edit - { date: 'YYYY-MM-DD', start: 'HH:MM', end: 'HH:MM', pauseMs }
     * @returns {Object} { startTime, endTime, duration }
     * @throws {Error} mit deutscher Fehlermeldung
     */
    function applyEdit(original, edit) {
        const timesChanged =
            edit.start !== Utils.timestampToDateTime(original.startTime).time ||
            edit.end !== Utils.timestampToDateTime(original.endTime).time;

        let startTime;
        let endTime;
        if (timesChanged) {
            startTime = Utils.dateTimeToTimestamp(edit.date, edit.start);
            endTime = Utils.dateTimeToTimestamp(edit.date, edit.end);
            if (endTime <= startTime) {
                throw new Error('Endzeit muss nach Startzeit liegen');
            }
        } else {
            const [year, month, day] = edit.date.split('-').map(Number);
            const originalDay = new Date(original.startTime);
            originalDay.setHours(0, 0, 0, 0);
            const days = Math.round((new Date(year, month - 1, day) - originalDay) / 86400000);
            const start = new Date(original.startTime);
            const end = new Date(original.endTime);
            start.setDate(start.getDate() + days);
            end.setDate(end.getDate() + days);
            startTime = start.getTime();
            endTime = end.getTime();
        }

        let duration;
        if (!timesChanged && edit.pauseMs === pauseOf(original)) {
            duration = original.duration;
        } else {
            const span = endTime - startTime;
            if (edit.pauseMs < 0 || edit.pauseMs >= span) {
                throw new Error('Pause muss kürzer als die Zeitspanne sein');
            }
            duration = span - edit.pauseMs;
        }

        return { startTime, endTime, duration };
    }

    function readEditForm() {
        return {
            date: els.editDate.value,
            start: els.editStart.value,
            end: els.editEnd.value,
            pauseMs: editing.pauseMs
        };
    }

    function isEditComplete(edit) {
        return Boolean(edit.date && edit.start && edit.end);
    }

    function updateEditPreview() {
        if (!editing) return;
        const edit = readEditForm();
        let text = '–';
        if (isEditComplete(edit)) {
            try {
                text = Utils.formatTime(applyEdit(editing.original, edit).duration).formatted;
            } catch (error) {
                text = '–';
            }
        }
        els.editDuration.value = text;

        const companyId = editCompany.getValue();
        els.editSave.disabled = saving || !companyId || !ctx.getCompanies().some(c => c.id === companyId);
    }

    function handlePauseInput() {
        if (!editing) return;
        const value = els.editPause.value;
        if (!value) {
            editing.pauseMs = 0;
        } else {
            const [hours, minutes] = value.split(':').map(Number);
            editing.pauseMs = (hours * 60 + minutes) * 60000;
        }
        updateEditPreview();
    }

    function openEditSheet(entry) {
        const companies = ctx.getCompanies();
        const categories = ctx.getCategories();

        editing = { original: entry, pauseMs: pauseOf(entry) };
        saving = false;

        const start = Utils.timestampToDateTime(entry.startTime);
        els.editDate.value = start.date;
        els.editStart.value = start.time;
        els.editEnd.value = Utils.timestampToDateTime(entry.endTime).time;
        els.editPause.value = msToClock(editing.pauseMs);

        editCompany.setOptions(companies.map(c => ({ value: c.id, label: c.name })));
        editCompany.setValue(companies.some(c => c.id === entry.companyId) ? entry.companyId : null);

        editCategory.setOptions([
            { value: '', label: 'Keine Kategorie' },
            ...categories.map(c => ({ value: c.id, label: c.name }))
        ]);
        editCategory.setValue(categories.some(c => c.id === entry.categoryId) ? entry.categoryId : '');

        els.editNote.value = entry.note || '';
        editNoteField.reset();

        updateEditPreview();
        editing.snapshot = editFormSnapshot();
        UI.openModal(els.editSheet, { autofocus: false });
    }

    function closeEditSheet() {
        editing = null;
        UI.closeModal(els.editSheet);
    }

    /**
     * Aktueller Formularzustand (zum Erkennen ungespeicherter Änderungen)
     * @returns {string}
     */
    function editFormSnapshot() {
        return JSON.stringify([
            els.editDate.value, els.editStart.value, els.editEnd.value, els.editPause.value,
            editCompany.getValue(), editCategory.getValue(), els.editNote.value.trim()
        ]);
    }

    /**
     * Schließen per Abbrechen, Backdrop oder ESC: bei ungespeicherten Änderungen nachfragen
     */
    async function requestCloseEditSheet() {
        if (!editing || saving || Components.hasOpenDialog()) return;

        if (editFormSnapshot() !== editing.snapshot) {
            const confirmed = await Components.confirm({
                title: 'Änderungen verwerfen?',
                text: 'Ihre Änderungen an diesem Eintrag werden nicht gespeichert.',
                confirmLabel: 'Verwerfen'
            });
            if (!confirmed) return;
        }
        closeEditSheet();
    }

    function isEditSheetOpen() {
        return els.editSheet.classList.contains('modal--open');
    }

    async function handleEditSave(event) {
        event.preventDefault();
        if (!editing || saving) return;

        const edit = readEditForm();
        if (!isEditComplete(edit)) {
            UI.showToast('Bitte Datum, Start und Ende angeben', 'error');
            return;
        }

        let times;
        try {
            times = applyEdit(editing.original, edit);
        } catch (error) {
            UI.showToast(error.message, 'error');
            return;
        }

        const note = els.editNote.value.trim();
        const updated = {
            ...editing.original,
            ...times,
            date: new Date(times.startTime).setHours(0, 0, 0, 0),
            companyId: editCompany.getValue(),
            categoryId: editCategory.getValue() || null,
            note: note || null
        };

        saving = true;
        updateEditPreview();
        try {
            await DB.updateTimeEntry(updated);
            closeEditSheet();
            await refresh();
            UI.showToast('Eintrag aktualisiert', 'success');
        } catch (error) {
            console.error('Fehler beim Aktualisieren:', error);
            UI.showToast('Fehler beim Speichern', 'error');
        } finally {
            saving = false;
            updateEditPreview();
        }
    }

    // ========================================
    // Initialisierung
    // ========================================

    /**
     * @param {Object} context - { getCompanies, getCategories, reloadData, deleteRecord }
     */
    function init(context) {
        ctx = context;

        els.list = document.getElementById('entries-list');
        els.editSheet = document.getElementById('modal-edit-entry');
        els.editForm = document.getElementById('form-edit-entry');
        els.editDate = document.getElementById('edit-date');
        els.editStart = document.getElementById('edit-start');
        els.editEnd = document.getElementById('edit-end');
        els.editPause = document.getElementById('edit-pause');
        els.editDuration = document.getElementById('edit-duration');
        els.editNote = document.getElementById('edit-note');
        els.editSave = document.getElementById('btn-edit-save');

        filter = Components.createPeriodFilter({
            filterHost: document.getElementById('entries-filter'),
            navigatorHost: document.getElementById('entries-navigator'),
            onChange: refresh
        });

        editCompany = Components.createDropdown(document.getElementById('edit-company-field'), {
            variant: 'outlined',
            placeholder: 'Unternehmen auswählen',
            ariaLabel: 'Unternehmen',
            onChange: updateEditPreview
        });
        editCategory = Components.createDropdown(document.getElementById('edit-category-field'), {
            variant: 'outlined',
            ariaLabel: 'Kategorie'
        });
        editNoteField = Components.attachSnippetButton(els.editNote);

        els.list.addEventListener('click', handleListClick);
        els.editForm.addEventListener('submit', handleEditSave);
        [els.editDate, els.editStart, els.editEnd].forEach(input => {
            input.addEventListener('input', updateEditPreview);
            input.addEventListener('change', updateEditPreview);
        });
        els.editPause.addEventListener('input', handlePauseInput);
        els.editPause.addEventListener('change', handlePauseInput);
        els.editSheet.querySelectorAll('[data-close-edit]').forEach(el => {
            el.addEventListener('click', requestCloseEditSheet);
        });
    }

    // Öffentliche API
    return {
        init,
        refresh,
        setDate: (date) => filter.setDate(date),
        isEditSheetOpen,
        closeEditSheet,
        requestCloseEditSheet
    };
})();
