/**
 * TimeTrack PWA - Service Worker
 * Offline-Funktionalität mit Cache-First Strategie
 */

const CACHE_NAME = 'timetrack-v8';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/utils.js',
    '/js/db.js',
    '/js/timer.js',
    '/js/ui.js',
    '/js/components.js',
    '/js/timer-view.js',
    '/js/entries-view.js',
    '/js/analysis-view.js',
    '/js/management-view.js',
    '/js/config.js',
    '/js/supabase.js',
    '/js/auth.js',
    '/js/sync.js',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable-512.png',
    '/icons/apple-touch-icon.png'
];

// Supabase SDK (feste Version, siehe index.html) – ohne Cache startet die App offline nur lokal
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0';

/**
 * Install Event - Statische Assets cachen
 */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return Promise.all([
                    cache.addAll(STATIC_ASSETS),
                    // SDK separat: ein CDN-Fehler darf die Installation nicht verhindern
                    cache.add(new Request(SDK_URL, { mode: 'cors' }))
                        .catch((error) => console.warn('[SW] SDK nicht gecacht:', error))
                ]);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

/**
 * Activate Event - Alte Caches löschen
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

/**
 * Fetch Event - Cache-First mit Network-Fallback
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Nur GET-Requests cachen
    if (request.method !== 'GET') {
        return;
    }

    // Google Fonts und Supabase SDK: aus dem Cache, parallel aktualisieren
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.href === SDK_URL) {
        event.respondWith(handleFonts(request));
        return;
    }

    // Lokale Assets mit Cache-First
    if (url.origin === self.location.origin) {
        event.respondWith(handleLocalAssets(request));
        return;
    }
});

/**
 * Cache-First Strategie für lokale Assets
 */
async function handleLocalAssets(request) {
    const cache = await caches.open(CACHE_NAME);
    
    // Versuche aus Cache zu laden
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Cache-Hit - Im Hintergrund aktualisieren (Stale-While-Revalidate)
        fetchAndCache(request, cache);
        return cachedResponse;
    }
    
    // Cache-Miss - Vom Netzwerk laden und cachen
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Offline und nicht im Cache - Fallback zur Startseite
        if (request.mode === 'navigate') {
            return cache.match('/index.html');
        }
        throw error;
    }
}

/**
 * Cache mit Network-Update für Fonts
 */
async function handleFonts(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Immer aus Cache wenn verfügbar, parallel aktualisieren
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

/**
 * Hintergrund-Fetch und Cache-Update
 */
async function fetchAndCache(request, cache) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Netzwerkfehler ignorieren - Cache bleibt bestehen
    }
}
