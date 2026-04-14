const VERSION = 'goatify-cache-v1';
const PAGE_CACHE = `pages-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(ASSET_CACHE);
    const shell = [
      './',
      './site.webmanifest',
      './logo-goatify-header.png'
    ];
    await Promise.all(shell.map(async (url) => {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (e) {}
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => ![PAGE_CACHE, ASSET_CACHE, RUNTIME_CACHE].includes(key))
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isRuntimeStatic(request, url) {
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image' || request.destination === 'font') return true;
  if (request.destination === 'video') return true;
  return /(\.css|\.js|\.png|\.jpg|\.jpeg|\.webp|\.svg|\.gif|\.woff2?|\.ttf|\.otf|\.mp4|\.webm)$/i.test(url.pathname);
}

function isFastCDN(url) {
  return (
    /cdn\.jsdelivr\.net$/i.test(url.hostname) ||
    /firebasestorage\.googleapis\.com$/i.test(url.hostname) ||
    /fonts\.googleapis\.com$/i.test(url.hostname) ||
    /fonts\.gstatic\.com$/i.test(url.hostname) ||
    /cdnjs\.cloudflare\.com$/i.test(url.hostname)
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let native media range requests go to network. The page itself already caches the hero video separately.
  if (request.headers.has('range')) return;

  // HTML navigations: network first, cache fallback, then minimal offline response.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const pageCache = await caches.open(PAGE_CACHE);
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          pageCache.put(request, fresh.clone());
        }
        return fresh;
      } catch (error) {
        const cached = await pageCache.match(request) || await pageCache.match('./');
        if (cached) return cached;
        return new Response(
          '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:Arial,sans-serif;padding:24px;background:#0b0b0f;color:#fff"><h1>Estás offline</h1><p>La versión guardada de esta página no estuvo disponible todavía. Vuelve a abrirla cuando tengas conexión para cachearla.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Static assets + CDNs: cache first, then refresh in background.
  if (isRuntimeStatic(request, url) || isFastCDN(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) {
        fetch(request).then((fresh) => {
          if (fresh && (fresh.ok || fresh.type === 'opaque')) {
            cache.put(request, fresh.clone());
          }
        }).catch(() => {});
        return cached;
      }

      try {
        const fresh = await fetch(request);
        if (fresh && (fresh.ok || fresh.type === 'opaque')) {
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch (error) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Default: network first, cache fallback.
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
      const fresh = await fetch(request);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (error) {
      return (await cache.match(request, { ignoreVary: true })) || (await caches.match(request, { ignoreVary: true })) || Response.error();
    }
  })());
});
