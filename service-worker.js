/* Goatify IA SW – versión vanilla, sin bundler */
/* Incrementa CACHE_VERSION si cambias esta lista ------------------- */
const CACHE_VERSION = 25;
const CACHE_NAME    = `goatify-cache-v${CACHE_VERSION}`;

const CORE_ASSETS = [
  '/',                 // index.html
  '/index.html',
  '/manifest.json',
  '/logos-hd.png'      // ← renombrado SIN espacios
];

/* ---------------- INSTALL ---------------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core assets…');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting())         // listo de inmediato
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

/* ---------------- ACTIVATE --------------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)      // elimina viejos
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* --------------- FETCH (Cache ‑ First) --- */
self.addEventListener('fetch', event => {
  // Sólo interceptamos peticiones de mismo origen
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(resp => resp || fetch(event.request))
  );
});

/* --------------- PUSH -------------------- */
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(
      data.title ?? 'Goatify IA',
      {
        body : data.body  ?? 'Tienes una nueva notificación.',
        icon : '/logos-hd.png',
        badge: '/logos-hd.png'
      }
    )
  );
});
