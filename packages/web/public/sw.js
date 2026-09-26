// Minimal offline shell: cache-first for static assets, never cache API/socket.
const CACHE = 'mcode-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/logo.png', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/live')) return;
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(
      (hit) => hit || fetch(event.request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('/'))
    )
  );
});
