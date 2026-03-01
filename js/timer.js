/**
 * TimeTrack PWA - Timer Module
 * Stoppuhr-Logik mit Persistenz
 */

const Timer = (function() {
    'use strict';

    // Timer State
    const state = {
        isRunning: false,
        isPaused: false,
        startTime: null,
        elapsed: 0,
        accumulatedTime: 0,
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
                const accumulated = parsed.accumulatedTime || 0;

                if (parsed.isPaused) {
                    state.isPaused = true;
                    state.isRunning = false;
                    state.accumulatedTime = accumulated;
                    state.startTime = parsed.originalStartTime || null;
                    state.elapsed = accumulated;
                    notifyStateChange();
                    if (typeof onTick === 'function') {
                        onTick(state.elapsed);
                    }
                } else if (parsed.isRunning && parsed.startTime) {
                    state.isRunning = true;
                    state.startTime = parsed.originalStartTime || parsed.startTime;
                    state._segmentStart = parsed.startTime;
                    state.accumulatedTime = accumulated;
                    state.elapsed = accumulated + (Date.now() - parsed.startTime);
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
                isPaused: state.isPaused,
                startTime: state.isRunning ? state._segmentStart : null,
                originalStartTime: state.startTime,
                accumulatedTime: state.accumulatedTime
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

            state.elapsed = state.accumulatedTime + (Date.now() - state._segmentStart);
            
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
                isPaused: state.isPaused,
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
        state.isPaused = false;
        state.startTime = Date.now();
        state._segmentStart = Date.now();
        state.accumulatedTime = 0;
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
        if (!state.isRunning && !state.isPaused) return null;

        stopTicking();
        
        const endTime = Date.now();
        let duration;
        if (state.isPaused) {
            duration = state.accumulatedTime;
        } else {
            duration = state.accumulatedTime + (endTime - state._segmentStart);
        }

        const result = {
            startTime: state.startTime,
            endTime: endTime,
            duration: duration
        };

        state.isRunning = false;
        state.isPaused = false;
        state.accumulatedTime = 0;
        state.elapsed = result.duration;

        clearState();
        notifyStateChange();

        if (typeof onStop === 'function') {
            onStop(result);
        }

        return result;
    }

    /**
     * Pausiert den Timer
     */
    function pause() {
        if (!state.isRunning) return;

        stopTicking();

        state.accumulatedTime += Date.now() - state._segmentStart;
        state.elapsed = state.accumulatedTime;
        state.isRunning = false;
        state.isPaused = true;

        saveState();
        notifyStateChange();
    }

    /**
     * Setzt den Timer nach einer Pause fort
     */
    function resume() {
        if (!state.isPaused) return;

        state.isPaused = false;
        state.isRunning = true;
        state._segmentStart = Date.now();

        saveState();
        startTicking();
        notifyStateChange();
    }

    /**
     * Setzt den Timer zurück ohne zu speichern
     */
    function reset() {
        stopTicking();
        
        state.isRunning = false;
        state.isPaused = false;
        state.startTime = null;
        state._segmentStart = null;
        state.accumulatedTime = 0;
        state.elapsed = 0;

        clearState();
        notifyStateChange();
        
        if (typeof onTick === 'function') {
            onTick(0);
        }
    }

    /**
     * Toggle Timer Start/Pause/Resume
     */
    function toggle() {
        if (state.isRunning) {
            pause();
        } else if (state.isPaused) {
            resume();
        } else {
            start();
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
     * Gibt zurück ob der Timer pausiert ist
     * @returns {boolean}
     */
    function isPaused() {
        return state.isPaused;
    }

    /**
     * Gibt die aktuelle verstrichene Zeit zurück
     * @returns {number} Millisekunden
     */
    function getElapsed() {
        if (state.isRunning) {
            return state.accumulatedTime + (Date.now() - state._segmentStart);
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
        pause,
        resume,
        reset,
        toggle,
        isRunning,
        isPaused,
        getElapsed,
        getStartTime,
        setOnTick,
        setOnStop,
        setOnStateChange
    };
})();
