const CACHE = 'qayyidha-v16';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/theme.css',
  './css/app.css',
  './js/main.js',
  './js/db.js',
  './js/engines.js',
  './js/stats.js',
  './js/icons.js',
  './js/views/home.js',
  './js/views/matches.js',
  './js/views/stats.js',
  './js/views/more.js',
  './js/views/newSession.js',
  './js/views/scoring.js',
  './js/views/playerDetail.js',
  './js/views/players.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
