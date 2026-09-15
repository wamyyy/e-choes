/* =====================================================
   CasaShoes Admin — Service Worker (PWA)
   Always bypasses cache for dynamic real-time admin orders
   ===================================================== */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.includes('admin') || key.startsWith('casashoes-admin'))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch directly from network — never cache admin dashboard
  return;
});
