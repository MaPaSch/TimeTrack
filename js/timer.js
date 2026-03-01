/**
 * TimeTrack PWA - Timer Module
 * Stoppuhr-Logik mit Persistenz
 */

const Timer = (function() {
    'use strict';

    // Timer State
    const state = {
        isRunning: false,
        startTime: null,
        elapsed: 0,
        animationFrameId: null
    };

    // LocalStorage Key für Persistenz
    const STORAGE_KEY = 'timetrack_timer_state';

    // Callbacks
    let onTick = null;
    let onStop = null;
    let onStateChange = null;

    /**
     * Lädt den Timer-Zustand aus localStorage
     */
    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.isRunning && parsed.startTime) {
                    // Timer war aktiv - fortsetzen
                    state.isRunning = true;
                    state.startTime = parsed.startTime;
                    state.elapsed = Date.now() - state.startTime;
                    startTicking();
                    notifyStateChange();
                }
            }
        } catch (e) {
            console.warn('Timer-Zustand konnte nicht geladen werden:', e);
        }
    }

    /**
     * Speichert den Timer-Zustand in localStorage
     */
    function saveState() {
        try {
            const toSave = {
                isRunning: state.isRunning,
                startTime: state.startTime
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
            console.warn('Timer-Zustand konnte nicht gespeichert werden:', e);
        }
    }

    /**
     * Löscht den gespeicherten Zustand
     */
    function clearState() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Timer-Zustand konnte nicht gelöscht werden:', e);
        }
    }

    /**
     * Startet den Animation-Frame-Loop für Updates
     */
    function startTicking() {
        function tick() {
            if (!state.isRunning) return;

            state.elapsed = Date.now() - state.startTime;
            
            if (typeof onTick === 'function') {
                onTick(state.elapsed);
            }

            state.animationFrameId = requestAnimationFrame(tick);
        }

        tick();
    }

    /**
     * Stoppt den Animation-Frame-Loop
     */
    function stopTicking() {
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = null;
        }
    }

    /**
     * Benachrichtigt über Zustandsänderung
     */
    function notifyStateChange() {
        if (typeof onStateChange === 'function') {
            onStateChange({
                isRunning: state.isRunning,
                elapsed: state.elapsed,
                startTime: state.startTime
            });
        }
    }

    /**
     * Startet den Timer
     */
    function start() {
        if (state.isRunning) return;

        state.isRunning = true;
        state.startTime = Date.now();
        state.elapsed = 0;

        saveState();
        startTicking();
        notifyStateChange();
    }

    /**
     * Stoppt den Timer und gibt die Daten zurück
     * @returns {Object} { startTime, endTime, duration }
     */
    function stop() {
        if (!state.isRunning) return null;

        stopTicking();
        
        const endTime = Date.now();
        const result = {
            startTime: state.startTime,
            endTime: endTime,
            duration: endTime - state.startTime
        };

        state.isRunning = false;
        state.elapsed = result.duration;

        clearState();
        notifyStateChange();

        if (typeof onStop === 'function') {
            onStop(result);
        }

        return result;
    }

    /**
     * Setzt den Timer zurück ohne zu speichern
     */
    function reset() {
        stopTicking();
        
        state.isRunning = false;
        state.startTime = null;
        state.elapsed = 0;

        clearState();
        notifyStateChange();
        
        if (typeof onTick === 'function') {
            onTick(0);
        }
    }

    /**
     * Toggle Timer Start/Stop
     * @returns {Object|null} Bei Stop: Zeiteintrag-Daten
     */
    function toggle() {
        if (state.isRunning) {
            return stop();
        } else {
            start();
            return null;
        }
    }

    /**
     * Gibt zurück ob der Timer läuft
     * @returns {boolean}
     */
    function isRunning() {
        return state.isRunning;
    }

    /**
     * Gibt die aktuelle verstrichene Zeit zurück
     * @returns {number} Millisekunden
     */
    function getElapsed() {
        if (state.isRunning) {
            return Date.now() - state.startTime;
        }
        return state.elapsed;
    }

    /**
     * Gibt die Startzeit zurück
     * @returns {number|null}
     */
    function getStartTime() {
        return state.startTime;
    }

    /**
     * Setzt Callback für Timer-Ticks
     * @param {Function} callback - (elapsed: number) => void
     */
    function setOnTick(callback) {
        onTick = callback;
    }

    /**
     * Setzt Callback für Timer-Stop
     * @param {Function} callback - (result: Object) => void
     */
    function setOnStop(callback) {
        onStop = callback;
    }

    /**
     * Setzt Callback für Zustandsänderungen
     * @param {Function} callback - (state: Object) => void
     */
    function setOnStateChange(callback) {
        onStateChange = callback;
    }

    /**
     * Initialisiert den Timer und lädt gespeicherten Zustand
     */
    function init() {
        loadState();
    }

    // Öffentliche API
    return {
        init,
        start,
        stop,
        reset,
        toggle,
        isRunning,
        getElapsed,
        getStartTime,
        setOnTick,
        setOnStop,
        setOnStateChange
    };
})();
