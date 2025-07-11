const CACHE_NAME = 'goatify-ia-cache-v14'; // ¡VERSIÓN INCREMENTADA!
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
  './Logos HD.png'
];

// Instala el Service Worker y guarda los archivos base en el caché.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
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
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta las solicitudes y responde desde el caché si es posible.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// ==================================================================
// === CÓDIGO NUEVO PARA RECIBIR Y MOSTRAR NOTIFICACIONES PUSH AÑADIDO AQUÍ ===
// ==================================================================

self.addEventListener('push', event => {
  console.log('¡Notificación Push Recibida!');

  // Lee los datos que enviaste desde tu servidor (Supabase Edge Function)
  const data = event.data.json();
  const title = data.title || 'Goatify IA';
  const options = {
    body: data.body || 'Tienes una nueva notificación.',
    icon: './Logos HD.png', // Ícono que se muestra en la notificación
    badge: './Logos HD.png' // Ícono para la "bolita" en Android
  };

  // Le dice al celular que muestre la notificación
  event.waitUntil(self.registration.showNotification(title, options));

  // Opcional: Para poner el número en el ícono de la app (la "bolita")
  if (navigator.setAppBadge) {
    navigator.setAppBadge(1); // Puedes cambiar el 1 por el número de notificaciones pendientes
  }
});
