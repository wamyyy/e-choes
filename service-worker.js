/* =====================================================
   CasaShoes — Service Worker
   Provides installability + a light offline app-shell cache.
   Bump CACHE_VERSION whenever you deploy new CSS/JS/HTML
   so old caches are cleared out automatically.
   ===================================================== */

const CACHE_VERSION = 'casashoes-v3';
const IMAGE_CACHE = 'casashoes-images-v3';
const MAX_IMAGE_ENTRIES = 150; // caps runtime image cache growth

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/cart.js',
  './js/checkout.js',
  './js/products.js',
  './js/image-manifest.js',
  './js/image-optim.js',
  './js/dark-photos.js',
  './manifest.json',
  './images/icons/icon-192.png',
  './images/icons/icon-512.png',
  './images/icons/apple-touch-icon.png'
];

// --- Install: pre-cache the app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// --- Activate: clear out old cache versions ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION && key !== IMAGE_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Trim the image cache down to MAX_IMAGE_ENTRIES (drops oldest entries first)
async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE);
  const keys = await cache.keys();
  if (keys.length <= MAX_IMAGE_ENTRIES) return;
  const excess = keys.length - MAX_IMAGE_ENTRIES;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}

function isImageRequest(request) {
  return request.destination === 'image' || /\.(avif|webp|jpe?g|png|svg)$/i.test(new URL(request.url).pathname);
}

// --- Fetch: cache-first for app shell + images, network-first fallback for everything else ---
self.addEventListener('fetch', (event) => {
  // Only handle GET requests, let everything else (POST, etc.) pass through
  if (event.request.method !== 'GET') return;

  // Images get their own cache-first strategy with a size cap, so the
  // three formats (avif/webp/original) per photo don't grow the app-shell
  // cache unbounded.
  if (isImageRequest(event.request)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response && response.status === 200 && response.type !== 'opaque') {
            cache.put(event.request, response.clone());
            trimImageCache();
          }
          return response;
        } catch (err) {
          return cached; // undefined -> browser shows its own offline image icon
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-OK or cross-origin opaque responses
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback: if it's a navigation request, serve the cached shell
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
