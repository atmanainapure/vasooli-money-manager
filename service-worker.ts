/// <reference lib="webworker" />

const CACHE_NAME = 'vasooli-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Note: We don't cache index.tsx directly as it's bundled.
  // The browser caches the resulting JS file automatically.
  // Add other static assets here like icons or manifest.json if needed.
  '/manifest.json',
  '/vite.svg'
];

// FIX: Add a triple-slash directive to the top of the file (`/// <reference lib="webworker" />`)
// to make TypeScript aware of service worker global types like `InstallEvent` and `FetchEvent`,
// which resolves the "Cannot find name" errors.
// FIX: Removed explicit `InstallEvent` type and relied on TypeScript's inference,
// which correctly types the event from the `addEventListener` signature.
self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// FIX: Removed explicit `FetchEvent` type and relied on TypeScript's inference.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
