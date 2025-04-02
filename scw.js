const fs = require('fs');
const path = require('path');

// Configuration
const CACHE_NAME = 'pulsemind-v1.2.0';
const RUNTIME_CACHE = 'runtime-pulsemind';
const NOTIFICATION_TITLE = 'Pengingat Harian';
const NOTIFICATION_ICON = '/svgs/solid/bell.svg';
const MAX_SNOOZE_COUNT = 3;
const EXCLUDE_PATTERNS = [
  /^\.github\//,
  /^\.git\//,
  /\.md$/,
  /\.cff$/,
  /LICENSE$/,
  /generate-sw\.js$/,
  /sw\.js$/,
  /package(-lock)?\.json$/,
  /node_modules\//
];

// Get all files recursively
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(relativePath));
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

  return `// Auto-generated Service Worker - ${new Date().toISOString()}
const CACHE_NAME = '${CACHE_NAME}';
const RUNTIME_CACHE = '${RUNTIME_CACHE}';
const NOTIFICATION_TITLE = '${NOTIFICATION_TITLE}';
const NOTIFICATION_ICON = '${NOTIFICATION_ICON}';
const MAX_SNOOZE_COUNT = ${MAX_SNOOZE_COUNT};
const PRECACHE_URLS = ${JSON.stringify(allUrls, null, 2)};

// ========== CORE FUNCTIONALITY ========== //
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => ![CACHE_NAME, RUNTIME_CACHE].includes(name))
          .map(name => caches.delete(name))
      );
    }).then(() => {
      self.clients.claim();
      initializeNotifications();
    })
  );
});

// ========== NOTIFICATION SYSTEM ========== //
async function initializeNotifications() {
  try {
    await cleanupOldNotifications();
    await scheduleDailyNotification();
  } catch (error) {
    console.error('Notification init failed:', error);
    showFallbackNotification();
  }
}

async function cleanupOldNotifications() {
  const notifications = await self.registration.getNotifications({
    tag: 'daily-reminder'
  });
  notifications.forEach(n => n.close());
}

async function scheduleDailyNotification() {
  const registration = await self.registration;
  const target = getNextNotificationTime();

  try {
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
    console.log('Notification scheduled for', target);
  } catch (error) {
    console.error('Notification scheduling failed:', error);
    showFallbackNotification();
  }
}

function getNextNotificationTime() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(8, 0, 0, 0);
  if (now > target) target.setDate(target.getDate() + 1);
  return target;
}

function showFallbackNotification() {
  setTimeout(() => {
    self.registration.showNotification(NOTIFICATION_TITLE, {
      body: 'Pengingat harian (fallback)',
      icon: NOTIFICATION_ICON,
      actions: [
        { action: 'open', title: 'Buka' },
        { action: 'snooze', title: 'Tunda 10 Menit' }
      ]
    });
  }, 30000); // Show after 30s if scheduling fails
}

// ========== EVENT HANDLERS ========== //
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    clients.openWindow('/');
  } else if (event.action === 'snooze') {
    event.waitUntil(handleSnooze(event.notification));
  } else {
    clients.openWindow('/');
  }
});

self.addEventListener('sync', (event) => {
  if (['daily-sync', 'visibility-sync'].includes(event.tag)) {
    event.waitUntil(handleDailySync());
  }
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'TRIGGER_UPDATE') {
    event.waitUntil(updateCharts());
  }
});

// ========== BUSINESS LOGIC ========== //
async function handleSnooze(notification) {
  const cache = await caches.open(RUNTIME_CACHE);
  const response = await cache.match('snooze-count');
  let count = response ? parseInt(await response.text()) : 0;

  if (count < MAX_SNOOZE_COUNT) {
    const newTime = Date.now() + 600000; // 10 minutes
    
    try {
      await self.registration.showNotification(NOTIFICATION_TITLE, {
        tag: 'daily-reminder',
        body: 'Notifikasi ditunda 10 menit',
        icon: NOTIFICATION_ICON,
        showTrigger: new TimestampTrigger(newTime),
        actions: notification.actions
      });
      
      await cache.put('snooze-count', new Response((count + 1).toString()));
    } catch (error) {
      console.error('Snooze failed:', error);
      showFallbackNotification();
    }
  }
}

async function handleDailySync() {
  await resetSnoozeCounter();
  await updateCharts();
}

async function resetSnoozeCounter() {
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.delete('snooze-count');
}

async function updateCharts() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'CHART_UPDATE', data: { forceRefresh: true } });
  });
}

// ========== FETCH HANDLER ========== //
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
  } else if (PRECACHE_URLS.some(url => event.request.url.includes(url))) {
    event.respondWith(handleStaticRequest(event.request));
  } else {
    event.respondWith(handleOtherRequest(event.request));
  }
});

async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    const clone = response.clone();
    caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

async function handleStaticRequest(request) {
  return (await caches.match(request)) || fetch(request);
}

async function handleOtherRequest(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}`;
}

// Main execution
const allFiles = getFiles('.');
const swContent = generateServiceWorker(allFiles);

fs.writeFileSync('sw.js', swContent);
console.log('✅ sw.js generated with', allFiles.length, 'precached files');
console.log('⚠️ Make sure to:');
console.log('1. Add manifest.json to your project');
console.log('2. Include notification icons at /svgs/solid/bell.svg');
console.log('3. Register the SW in your main HTML file');
