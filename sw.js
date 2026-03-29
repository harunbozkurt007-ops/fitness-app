/* FitTrack — Service Worker v1.0 */

const CACHE_NAME  = 'fittrack-v1';
const CACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './exercises.js',
  './manifest.json'
];

/* Install: app shell'i önbelleğe al */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* Activate: eski cache'leri temizle */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: Cache-First + Network Fallback */
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini yakala
  if (event.request.method !== 'GET') return;

  // Chrome extension veya başka şemalar
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Geçerli yanıt ise cache'le
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Ağ yoksa index.html döndür (offline fallback)
          return caches.match('./index.html');
        });
    })
  );
});
