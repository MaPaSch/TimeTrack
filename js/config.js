/**
 * TimeTrack PWA - Konfiguration
 * Supabase und App-Einstellungen
 */

const Config = (function() {
    'use strict';

    // Supabase Konfiguration
    // Diese Werte müssen mit den Daten aus dem Supabase Dashboard ersetzt werden
    const SUPABASE_URL = 'https://andgylotaalnbrpmlojo.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_2FwzSwfEdJ9zAlATmWknYw_zh6Bka78';

    // App-Konfiguration
    const APP_VERSION = '2.1.0';
    const SYNC_INTERVAL_MS = 300000; // 5 Minuten (Delta-Pull)
    const SYNC_RETRY_DELAY_MS = 5000; // 5 Sekunden bei Fehler
    const PUSH_DEBOUNCE_MS = 5000; // 5 Sekunden Debounce für Push

    /**
     * Basis-URL der App für E-Mail-Links (z. B. Passwort zurücksetzen).
     * Wenn gesetzt, wird diese URL in E-Mails verwendet statt der aktuellen Seite (vermeidet localhost in Produktion).
     * - Produktion: 'https://deine-app.vercel.app' oder 'https://timetrack.example.com'
     * - Lokaler Test: Tunnel-URL eintragen (z. B. ngrok: 'https://abc123.ngrok-free.app'), dann diese URL
     *   in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs eintragen.
     * Leer lassen = aktuelle Seite (E-Mail-Link zeigt dann auf localhost und ist von außen nicht erreichbar).
     */
    const APP_BASE_URL = '';

    /**
     * Prüft ob Supabase konfiguriert ist
     * @returns {boolean}
     */
    function isSupabaseConfigured() {
        return SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' 
            && SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY'
            && SUPABASE_URL.length > 0 
            && SUPABASE_ANON_KEY.length > 0;
    }

    /**
     * Gibt die Redirect-URL für Passwort-Reset-E-Mails zurück (muss in Supabase Dashboard eingetragen sein).
     * Nutzt APP_BASE_URL, wenn gesetzt; sonst aktuelle Seite (origin + pathname).
     * @returns {string}
     */
    function getPasswordResetRedirectUrl() {
        if (typeof window === 'undefined') return '';
        const base = (typeof APP_BASE_URL === 'string' && APP_BASE_URL.trim() !== '')
            ? APP_BASE_URL.trim().replace(/\/$/, '')
            : null;
        if (base) {
            return base + (window.location.pathname || '/');
        }
        return window.location.origin + window.location.pathname;
    }

    return {
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        APP_VERSION,
        SYNC_INTERVAL_MS,
        SYNC_RETRY_DELAY_MS,
        PUSH_DEBOUNCE_MS,
        isSupabaseConfigured,
        getPasswordResetRedirectUrl
    };
})();
