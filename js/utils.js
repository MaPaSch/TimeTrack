/**
 * TimeTrack PWA - Utility Functions
 * Hilfsfunktionen für Zeitformatierung, IDs und Datumsberechnung
 */

const Utils = (function() {
    'use strict';

    /**
     * Generiert eine eindeutige UUID v4
     * @returns {string} UUID
     */
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Formatiert Millisekunden zu HH:MM:SS
     * @param {number} ms - Millisekunden
     * @returns {string} Formatierte Zeit
     */
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return {
            hours: String(hours).padStart(2, '0'),
            minutes: String(minutes).padStart(2, '0'),
            seconds: String(seconds).padStart(2, '0'),
            formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        };
    }

    /**
     * Formatiert Millisekunden zu kompakter Darstellung (z.B. "2h 30m")
     * @param {number} ms - Millisekunden
     * @returns {string} Kompakte Zeit
     */
    function formatDuration(ms) {
        const totalMinutes = Math.ceil(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0) {
            return `${minutes}m`;
        }
        if (minutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${minutes}m`;
    }

    /**
     * Formatiert einen Timestamp zu einem lesbaren Datum
     * @param {number} timestamp - Unix Timestamp in ms
     * @param {string} format - 'short', 'long', 'weekday'
     * @returns {string} Formatiertes Datum
     */
    function formatDate(timestamp, format = 'short') {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = isSameDay(date, today);
        const isYesterday = isSameDay(date, yesterday);

        if (format === 'weekday') {
            if (isToday) return 'Heute';
            if (isYesterday) return 'Gestern';
            return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
        }

        if (format === 'long') {
            return date.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }

        // short format
        if (isToday) return 'Heute';
        if (isYesterday) return 'Gestern';
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    /**
     * Formatiert einen Timestamp zu Uhrzeit
     * @param {number} timestamp - Unix Timestamp in ms
     * @returns {string} Formatierte Uhrzeit (HH:MM)
     */
    function formatTimeOfDay(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Prüft ob zwei Daten am gleichen Tag sind
     * @param {Date} date1 
     * @param {Date} date2 
     * @returns {boolean}
     */
    function isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    /**
     * Gibt Start- und Endzeitpunkt für einen Zeitraum zurück
     * @param {string} period - 'day', 'week', 'month', 'year', 'all'
     * @returns {Object} { start: timestamp, end: timestamp }
     */
    function getDateRange(period) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        let start, end;
        end = new Date(today);
        end.setDate(end.getDate() + 1); // Ende des heutigen Tages

        switch (period) {
            case 'day':
                start = today;
                break;
            case 'week':
                start = new Date(today);
                const dayOfWeek = start.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Montag als Wochenstart
                start.setDate(start.getDate() - diff);
                break;
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'year':
                start = new Date(today.getFullYear(), 0, 1);
                break;
            case 'all':
            default:
                start = new Date(0); // Anfang der Zeit
                break;
        }

        return {
            start: start.getTime(),
            end: end.getTime()
        };
    }

    /**
     * Gruppiert Einträge nach Datum
     * @param {Array} entries - Array von TimeEntry-Objekten
     * @returns {Object} Gruppierte Einträge { dateKey: [entries] }
     */
    function groupEntriesByDate(entries) {
        const groups = {};
        
        entries.forEach(entry => {
            const date = new Date(entry.date);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: entry.date,
                    entries: []
                };
            }
            groups[dateKey].entries.push(entry);
        });

        // Sortiere nach Datum absteigend
        return Object.keys(groups)
            .sort((a, b) => b.localeCompare(a))
            .reduce((acc, key) => {
                acc[key] = groups[key];
                return acc;
            }, {});
    }

    /**
     * Berechnet die Gesamtdauer einer Eintrags-Liste
     * @param {Array} entries - Array von TimeEntry-Objekten
     * @returns {number} Gesamtdauer in ms
     */
    function calculateTotalDuration(entries) {
        return entries.reduce((total, entry) => total + (entry.duration || 0), 0);
    }

    /**
     * Debounce-Funktion für Performance
     * @param {Function} func 
     * @param {number} wait 
     * @returns {Function}
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Konvertiert ein Date-Input-Value zu einem Timestamp
     * @param {string} dateString - YYYY-MM-DD
     * @param {string} timeString - HH:MM
     * @returns {number} Timestamp in ms
     */
    function dateTimeToTimestamp(dateString, timeString) {
        const [year, month, day] = dateString.split('-').map(Number);
        const [hours, minutes] = timeString.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes).getTime();
    }

    /**
     * Konvertiert einen Timestamp zu Date-Input-Werten
     * @param {number} timestamp 
     * @returns {Object} { date: 'YYYY-MM-DD', time: 'HH:MM' }
     */
    function timestampToDateTime(timestamp) {
        const date = new Date(timestamp);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        return { date: dateStr, time: timeStr };
    }

    /**
     * Formatiert ein Datum für den Datumsnavigator
     * @param {string} period - 'day', 'week', 'month', 'year'
     * @param {Date} date - Das Datum
     * @returns {string} Formatierter Text
     */
    function formatNavigatorDate(period, date) {
        const d = new Date(date);
        
        const weekdays = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
        const months = ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ'];
        const monthsFull = ['JANUAR', 'FEBRUAR', 'MÄRZ', 'APRIL', 'MAI', 'JUNI', 'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DEZEMBER'];
        
        switch (period) {
            case 'day':
                return `${weekdays[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]}`;
            case 'week':
                const weekNumber = getWeekNumber(d);
                return `KW ${weekNumber}, ${d.getFullYear()}`;
            case 'month':
                return `${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
            case 'year':
                return `${d.getFullYear()}`;
            default:
                return `${monthsFull[d.getMonth()]} ${d.getFullYear()}`;
        }
    }

    /**
     * Berechnet die Kalenderwoche
     * @param {Date} date 
     * @returns {number} Kalenderwoche
     */
    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Gibt Start- und Endzeitpunkt für einen Zeitraum basierend auf Navigator-Datum zurück
     * @param {string} period - 'day', 'week', 'month', 'year'
     * @param {Date} navigatorDate - Das Navigatordatum
     * @returns {Object} { start: timestamp, end: timestamp }
     */
    function getDateRangeForNavigator(period, navigatorDate) {
        const d = new Date(navigatorDate);
        let start, end;

        switch (period) {
            case 'day':
                start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
                break;
            case 'week':
                start = new Date(d);
                const dayOfWeek = start.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Montag als Wochenstart
                start.setDate(start.getDate() - diff);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 7);
                break;
            case 'month':
                start = new Date(d.getFullYear(), d.getMonth(), 1);
                end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                break;
            case 'year':
                start = new Date(d.getFullYear(), 0, 1);
                end = new Date(d.getFullYear() + 1, 0, 1);
                break;
            default:
                start = new Date(0);
                end = new Date();
                end.setDate(end.getDate() + 1);
                break;
        }

        return {
            start: start.getTime(),
            end: end.getTime()
        };
    }

    // Öffentliche API
    return {
        generateId,
        formatTime,
        formatDuration,
        formatDate,
        formatTimeOfDay,
        isSameDay,
        getDateRange,
        getDateRangeForNavigator,
        formatNavigatorDate,
        getWeekNumber,
        groupEntriesByDate,
        calculateTotalDuration,
        debounce,
        dateTimeToTimestamp,
        timestampToDateTime
    };
})();
