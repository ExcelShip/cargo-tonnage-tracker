// Bump this version string on every deploy to force a fresh cache.
const CACHE = 'money-list-v2';
const SHELL = ['./index.html', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always go live for Google Sheets data
  if (url.includes('googleapis.com') || url.includes('google.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for the main page so deploys show up immediately.
  // Falls back to cache only when offline.
  if (e.request.mode === 'navigate' || url.includes('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets (icon, manifest, fonts) for speed.
  // The version bump above refreshes these on each deploy.
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
