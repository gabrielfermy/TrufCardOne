const CACHE_NAME = 'gns-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/logo.png'
];

// Install: pre-cache static assets & immediately activate
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching assets warning:', err);
      });
    })
  );
});

// Activate: delete old caches and take immediate control of clients
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Ignore non-GET requests or chrome-extension schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Always fetch version.json from network to ensure instant deployment detection
  if (request.url.includes('/version.json')) {
    e.respondWith(fetch(request));
    return;
  }

  // 1. Navigation / HTML Requests: Network-First (always fresh, offline fallback)
  if (request.mode === 'navigate' || request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, images, etc.): Cache-First with Network Fallback
  e.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          // Never cache HTML fallback when requesting scripts/stylesheets
          const contentType = networkResponse.headers.get('content-type') || '';
          if (
            (request.destination === 'script' || request.url.endsWith('.js')) &&
            contentType.includes('text/html')
          ) {
            return networkResponse;
          }

          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    })
  );
});
