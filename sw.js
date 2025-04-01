// Service Worker for PulseMind GSR Monitor
const CACHE_NAME = 'pulsemind-v1.1.0';
const RUNTIME_CACHE = 'runtime-pulsemind';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/img/icon-192x192.png',
  '/data/gsr.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install Phase - Precaching Critical Resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Pre-caching offline page');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Phase - Cache Cleanup
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch Handler with Network-First Strategy
self.addEventListener('fetch', event => {
  // API Requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for cache
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // Fallback to cached API responses
          return caches.match(event.request)
            .then(response => response || caches.match('/pulsemind/assets/fallback-data.json'));
        })
    );
  }
  // Static Assets (Cache-First)
  else if (PRECACHE_URLS.some(url => event.request.url.includes(url))) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => cachedResponse || fetch(event.request))
    );
  }
  // All Other Requests (Network-First)
  else {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});

// Background Sync for Offline Data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-gsr-data') {
    event.waitUntil(syncGSRData());
  }
});

async function syncGSRData() {
  const cache = await caches.open(RUNTIME_CACHE);
  const requests = await cache.keys();
  const apiRequests = requests.filter(request => request.url.includes('/api/'));
  
  for (const request of apiRequests) {
    try {
      const response = await fetch(request);
      if (!response.ok) throw new Error('Network response was not ok');
      await cache.delete(request);
    } catch (error) {
      console.error('Sync failed for:', request.url, error);
      return Promise.reject();
    }
  }
}

// Periodic Sync (for fresh data)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-gsr-charts') {
    event.waitUntil(updateCharts());
  }
});

function updateCharts() {
  return clients.matchAll({type: 'window'})
    .then(windowClients => {
      windowClients.forEach(windowClient => {
        windowClient.postMessage({
          type: 'CHART_UPDATE',
          data: {forceRefresh: true}
        });
      });
    });
}
