// service-worker.js

// VERSIÓN INCREMENTADA PARA FORZAR LA ACTUALIZACIÓN
const CACHE_NAME = 'goatify-ia-cache-v23'; 

// Solo cacheamos los archivos locales. Los externos (CDN, Google Fonts) los maneja el navegador.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json', // Añadido para PWA
  '/Logos HD.png',
  // Quitamos los URLs externos que causaban el error de CORS
];

// Instala el Service Worker y guarda los archivos base en el caché.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Abriendo caché y guardando archivos base');
      return cache.addAll(urlsToCache);
    }).then(() => {
      // Forzar la activación del nuevo Service Worker inmediatamente
      console.log('Service Worker: Skip waiting. Forzando activación.');
      return self.skipWaiting();
    }).catch(error => {
      // Este log es crucial para ver si la instalación falla
      console.error('Service Worker: Falló la instalación', error);
    })
  );
});

// Activa el Service Worker y elimina cachés viejos.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (CACHE_NAME !== cacheName) {
            console.log('Service Worker: Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Reclamando clientes.');
      return self.clients.claim();
    })
  );
});

// Intercepta las solicitudes y responde desde el caché si es posible (estrategia Cache First).
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Si se encuentra en caché, lo devuelve. Si no, va a la red.
      return response || fetch(event.request);
    })
  );
});

// Listener para notificaciones push (sin cambios)
self.addEventListener('push', event => {
  console.log('¡Notificación Push Recibida!');
  const data = event.data.json();
  const title = data.title || 'Goatify IA';
  const options = {
    body: data.body || 'Tienes una nueva notificación.',
    icon: './Logos HD.png',
    badge: './Logos HD.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
  if (navigator.setAppBadge) {
    navigator.setAppBadge(1);
  }
});
