const CACHE = 'raices-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/components.css',
  '/css/layout.css',
  '/js/app.js',
  '/js/firebase.js',
  '/js/state.js',
  '/js/auth.js',
  '/js/habits.js',
  '/js/render.js',
  '/js/modal.js',
  '/js/ui.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  // Solo cachear assets propios, no Firebase
  if (e.request.url.includes('firebase') || e.request.url.includes('google')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
