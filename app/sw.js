// Offline cache for the static files. Stale-while-revalidate: answer instantly
// from cache (the NFC tap must feel immediate) and refresh the cache in the background.

const CACHE = 'daycounter-v2';
const FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/core.js',
  './src/storage.js',
  './src/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  // Ignore the query string so "./?nfc=1" is served from the cached "./".
  const key = request.url.split('?')[0];

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(key);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(key, response.clone());
          return response;
        })
        .catch(() => cached);
      event.waitUntil(network.then(() => {}));
      return cached || network;
    }),
  );
});
