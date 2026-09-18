const CACHE = 'qayyidha-v11';
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
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
  );
});
