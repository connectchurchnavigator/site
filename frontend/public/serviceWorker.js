const CACHE_NAME = 'churchnavigator-v1';
const urlsToCache = [
  '/',
  '/churches',
  '/static/css/main.chunk.css',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            return response;
          }).catch(() => {
            if (request.mode === 'navigate') {
              return caches.match('/offline.html').then((offlineResponse) => {
                return offlineResponse || new Response(
                  '<html><head><title>Offline</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f9fafb}div{text-align:center;color:#6b7280}h1{color:#7c3aed;margin-bottom:1rem}</style></head><body><div><h1>You\'re Offline</h1><p>ChurchNavigator requires an internet connection.</p><p>Please check your connection and try again.</p></div></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
            }
            return new Response('Network error', { status: 408, statusText: 'Network error' });
          });
        })
    );
  }
});