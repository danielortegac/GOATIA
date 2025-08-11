/* Goatify IA SW – v32  */
const CACHE_VERSION = 26;
const CACHE_NAME = `goatify-cache-v${CACHE_VERSION}`;
const CORE_ASSETS = ['/', '/index.html', '/manifest.json', '/logos-hd.png'];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evt => {
  const { url } = evt.request;

  // 🔒 Nunca interceptar funciones ni API externas
  if (url.includes('/.netlify/functions/') ||
      url.includes('supabase.co') ||
      url.includes('paypal.com')) return;

  // Cache‑First
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});

self.addEventListener('push', evt => {
  const d = evt.data?.json() ?? {};
  evt.waitUntil(
    self.registration.showNotification(d.title ?? 'Goatify IA', {
      body : d.body  ?? 'Tienes una nueva notificación.',
      icon : '/logos-hd.png',
      badge: '/logos-hd.png'
    })
  );
});
