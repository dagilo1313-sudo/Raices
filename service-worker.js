const CACHE = 'raices-v102c';
const ASSETS = [
  '/Raices/',
  '/Raices/index.html',
  '/Raices/css/variables.css',
  '/Raices/css/components.css',
  '/Raices/css/layout.css',
  '/Raices/js/app.js',
  '/Raices/js/firebase.js',
  '/Raices/js/state.js',
  '/Raices/js/auth.js',
  '/Raices/js/habits.js',
  '/Raices/js/render.js',
  '/Raices/js/modal.js',
  '/Raices/js/ui.js',
  '/Raices/manifest.json',
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
