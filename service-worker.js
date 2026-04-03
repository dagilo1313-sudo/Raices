const CACHE = 'raices-v9.2';
const ASSETS = [
  './',
  './index.html',
  './css/variables.css',
  './css/components.css',
  './css/layout.css',
  './js/app.js',
  './js/firebase.js',
  './js/state.js',
  './js/auth.js',
  './js/habits.js',
  './js/render.js',
  './js/modal.js',
  './js/ui.js',
  './js/resumen.js',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('firebase') || e.request.url.includes('google') || e.request.url.includes('gstatic')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
