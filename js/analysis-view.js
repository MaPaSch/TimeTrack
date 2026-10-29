/**
 * TimeTrack PWA - Analysis View
 * Seite "Auswertung": Gesamtzeit mit Anteilsbalken und Zeit pro Kategorie
 */

const AnalysisView = (function() {
    'use strict';

    // Kontext der App: { getCompanies, getCategories }
    let ctx = null;

    let contentEl = null;
    let filter = null;

    /**
     * Summiert die Dauer pro Kategorie. Unbekannte (gelöschte) Kategorien
     * zählen zu "Ohne Kategorie". Absteigend nach Dauer sortiert.
     * @param {Array} entries
     * @param {Array} categories
     * @returns {Object} { rows: [{ name, color, duration, displayDuration, percent, uncategorized }], total }
     */
    /**
     * Verteilt eine ganzzahlige Summe proportional auf Anteile (Largest-Remainder),
     * damit die gerundeten Teile exakt die Summe ergeben
     * @param {Array<number>} values - Anteile (beliebige Einheit)
     * @param {number} total - ganzzahlige Zielsumme
     * @returns {Array<number>}
     */
    function distribute(values, total) {
        const sum = values.reduce((a, b) => a + b, 0);
        if (sum === 0) return values.map(() => 0);
        const exact = values.map(v => (v / sum) * total);
        const result = exact.map(Math.floor);
        let rest = total - result.reduce((a, b) => a + b, 0);
        exact
            .map((v, i) => ({ i, fraction: v - Math.floor(v) }))
            .sort((a, b) => b.fraction - a.fraction)
            .forEach(({ i }) => {
                if (rest > 0) {
                    result[i]++;
                    rest--;
                }
            });
        return result;
    }

    function summarizeByCategory(entries, categories) {
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const durations = new Map();
        let total = 0;

        entries.forEach(entry => {
            const key = categoryMap.has(entry.categoryId) ? entry.categoryId : Components.NO_CATEGORY;
            durations.set(key, (durations.get(key) || 0) + entry.duration);
            total += entry.duration;
        });

        const sorted = Array.from(durations.entries()).sort((a, b) => b[1] - a[1]);
        // Angezeigte Minuten und Prozente so runden, dass sie exakt die Gesamtwerte ergeben
        const minutes = distribute(sorted.map(([, d]) => d), Math.ceil(total / 60000));
        const percents = distribute(sorted.map(([, d]) => d), 100);

        const rows = sorted.map(([key, duration], index) => {
            const category = categoryMap.get(key) || null;
            return {
                name: category ? category.name : 'Ohne Kategorie',
                color: UI.categoryColor(category),
                duration,
                displayDuration: minutes[index] * 60000,
                percent: percents[index],
                uncategorized: !category
            };
        });

        return { rows, total };
    }

    function render(entries, categories) {
        const { rows, total } = summarizeByCategory(entries, categories);

        if (total === 0) {
            contentEl.innerHTML = Components.emptyState('barChart', 'Keine Daten vorhanden');
            return;
        }

        const escape = Components.escapeHtml;

        const segments = rows.map(row =>
            `<span class="share-bar__segment" style="flex-grow: ${row.duration}; background-color: ${row.color}" title="${escape(row.name)}"></span>`
        ).join('');

        const bars = rows.map(row => `
            <div class="category-bar" style="background-color: ${row.color}">
                <span class="category-bar__icon">${row.uncategorized ? Components.icon('help') : ''}</span>
                <span class="category-bar__name">${escape(row.name)}</span>
                <span class="category-bar__duration">${Utils.formatDuration(row.displayDuration)}</span>
                <span class="category-bar__percent">${row.percent}%</span>
            </div>
        `).join('');

        contentEl.innerHTML = `
            <div class="summary-card">
                <span class="summary-card__label">Gesamt</span>
                <span class="summary-card__value">${Utils.formatDuration(total)}</span>
                <div class="share-bar" role="img" aria-label="Anteile nach Kategorie">${segments}</div>
            </div>
            <div class="category-bars">${bars}</div>
        `;
    }

    /**
     * Lädt die Einträge für den aktuellen Filter und rendert die Auswertung
     */
    async function refresh() {
        const categories = ctx.getCategories();
        filter.setLists(ctx.getCompanies(), categories);

        try {
            const entries = await DB.getTimeEntries({
                companyId: filter.getState().companyId,
                dateRange: filter.getDateRange()
            });
            render(filter.filterByCategory(entries, categories), categories);
        } catch (error) {
            console.error('Fehler beim Laden der Auswertung:', error);
            contentEl.innerHTML = Components.emptyState('error', 'Fehler beim Laden der Daten');
        }
    }

    /**
     * @param {Object} context - { getCompanies, getCategories }
     */
    function init(context) {
        ctx = context;
        contentEl = document.getElementById('analysis-content');

        filter = Components.createPeriodFilter({
            filterHost: document.getElementById('analysis-filter'),
            navigatorHost: document.getElementById('analysis-navigator'),
            onChange: refresh
        });
    }

    // Öffentliche API
    return {
        init,
        refresh,
        setDate: (date) => filter.setDate(date)
    };
})();
