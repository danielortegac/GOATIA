/* eslint-disable no-undef */

// Incrementar cada vez que cambies esta lista
const CACHE_NAME = 'goatify-ia-cache-v24';

/* ⚠️  Los nombres con espacios rompen cache.addAll() en algunos navegadores.
   Renombra tu imagen a logos-hd.png (o usa %20) en el repo:
   public/logos-hd.png →  /logos-hd.png
*/
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logos-hd.png'
];

// ------------ INSTALL ------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())     // Inmediatamente activo
      .catch(err => console.error('[SW] Install failed:', err))
  );
});

// ------------ ACTIVATE ------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(k => k !== CACHE_NAME && caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ------------ FETCH ------------
self.addEventListener('fetch', event => {
  // Solo caché de mismo origen; para externos deja que el navegador decida
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true })
        .then(resp => resp || fetch(event.request))
    );
  }
});

// ------------ PUSH NOTIFICATIONS ------------
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title   = data.title || 'Goatify IA';
  const options = {
    body : data.body  || 'Tienes una nueva notificación.',
    icon : '/logos-hd.png',
    badge: '/logos-hd.png'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // setAppBadge solo existe en la página; aquí no sirve
});
