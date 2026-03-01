/**
 * TimeTrack PWA - Service Worker
 * Offline-Funktionalität mit Cache-First Strategie
 */

const CACHE_NAME = 'timetrack-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/utils.js',
    '/js/db.js',
    '/js/timer.js',
    '/js/ui.js',
    '/js/app.js',
    '/manifest.json',
    '/icons/icon.svg'
];

// Google Fonts URLs zum Cachen
const FONT_URLS = [
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
];

/**
 * Install Event - Statische Assets cachen
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Install complete');
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
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activate complete');
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

    // Google Fonts separat behandeln (Cache mit Network-Update)
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
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

/**
 * Message Event - Für manuelle Cache-Updates
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});
