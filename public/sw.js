const CACHE_NAME = 'ksk-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/deck.html',
  '/customdeck.html',
  '/manifest.json',
  '/icon.png',
  '/css/base.css',
  '/css/deck.css',
  '/ksk-ui.js',
  '/js/shared.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy to ensure live triggers and dynamic assets never lag
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always bypass cache for APIs, triggers, uploads, socket.io, and assets
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/trigger') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/upload') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/deck.html');
          }
        });
      })
  );
});
