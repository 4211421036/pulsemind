const fs = require('fs');
const path = require('path');

// Configuration
const CACHE_NAME = 'pulsemind-v1.1.0';
const RUNTIME_CACHE = 'runtime-pulsemind';
const EXCLUDE_PATTERNS = [
  /^\.github\//,
  /^\.git\//,
  /\.md$/,
  /\.cff$/,
  /LICENSE$/,
  /generate-sw\.js$/,
  /package(-lock)?\.json$/,
  /node_modules\//
];
const NOTIFICATION_TITLE = 'Pengingat Harian';
const NOTIFICATION_ICON = '/svgs/solid/bell.svg';
const MAX_SNOOZE_COUNT = 3;

// Get all files in directory recursively
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      // Check if file should be excluded
      const shouldExclude = EXCLUDE_PATTERNS.some(pattern => 
        pattern.test(relativePath)
      );
      
      if (!shouldExclude) {
        fileList.push('/' + relativePath);
      }
    }
  });
  
  return fileList;
}

// Generate the service worker content
function generateServiceWorker(files) {
  const allUrls = ['/'].concat(files);
  
  return `// Auto-generated Service Worker for PulseMind GSR Monitor
const CACHE_NAME = '${CACHE_NAME}';
const RUNTIME_CACHE = '${RUNTIME_CACHE}';
const PRECACHE_URLS = ${JSON.stringify(allUrls, null, 2)};
const NOTIFICATION_TITLE = '${NOTIFICATION_TITLE}';
const NOTIFICATION_ICON = '${NOTIFICATION_ICON}';
const MAX_SNOOZE_COUNT = ${MAX_SNOOZE_COUNT};

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
    }).then(() => {
      self.clients.claim();
      scheduleDailyNotification();
    })
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

// Scheduled Notification Logic
const scheduleDailyNotification = async () => {
  try {
    const registration = await self.registration;
    const now = new Date();
    const target = new Date();
    
    // Set target to next 08:00
    target.setHours(8, 0, 0, 0);
    if (now > target) target.setDate(target.getDate() + 1);

    // Check existing alarms
    const alarms = await registration.getNotifications({
      tag: 'daily-reminder'
    });
    
    if (alarms.length === 0) {
      await registration.showNotification(NOTIFICATION_TITLE, {
        tag: 'daily-reminder',
        body: 'Waktunya memeriksa GSR Anda!',
        icon: NOTIFICATION_ICON,
        showTrigger: new TimestampTrigger(target.getTime()),
        actions: [
          { action: 'open', title: 'Buka' },
          { action: 'snooze', title: 'Tunda 10 Menit' }
        ]
      });
      console.log('Scheduled daily notification for', target);
    }
  } catch (error) {
    console.error('Notification scheduling failed:', error);
  }
};

// Notification Click Handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'snooze') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const response = await cache.match('snooze-count');
        let currentCount = 0;
        
        if (response) {
          currentCount = parseInt(await response.text());
        }
        
        if (currentCount < MAX_SNOOZE_COUNT) {
          // Schedule new notification
          const newTime = Date.now() + 600000; // 10 menit
          await self.registration.showNotification(NOTIFICATION_TITLE, {
            tag: 'daily-reminder',
            body: 'Notifikasi ditunda 10 menit',
            icon: NOTIFICATION_ICON,
            showTrigger: new TimestampTrigger(newTime),
            actions: event.notification.actions
          });
          
          // Update snooze count
          const newResponse = new Response((currentCount + 1).toString());
          await cache.put('snooze-count', newResponse);
          console.log('Notification snoozed, count:', currentCount + 1);
        }
      })()
    );
  } else {
    // Default action when notification is clicked (no buttons)
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Reset snooze counter daily
self.addEventListener('periodicsync', event => {
  if (event.tag === 'reset-snooze-counter') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then(cache => 
        cache.delete('snooze-count')
      ).then(() => 
        console.log('Snooze counter reset')
      )
    );
  }
});

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
}`;
}

// Main execution
const allFiles = getFiles('.');
const swContent = generateServiceWorker(allFiles);

fs.writeFileSync('sw.js', swContent);
console.log('sw.js generated successfully with', allFiles.length, 'files to cache');
