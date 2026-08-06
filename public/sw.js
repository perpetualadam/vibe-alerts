/* VibeAlerts PWA service worker — shell cache, offline logs, Web Push */
/* eslint-disable no-restricted-globals */

const VERSION = 'vibealerts-pwa-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const LOGS_CACHE = `${VERSION}-logs`;

const PRECACHE_URLS = [
  '/dashboard',
  '/dashboard/notifications',
  '/dashboard/setup',
  '/dashboard/analytics',
  '/manifest.webmanifest',
  '/offline',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('vibealerts-pwa-') && key !== SHELL_CACHE && key !== LOGS_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/**
 * Network-first for notification logs (cache for offline).
 * Cache-first for static shell navigations when offline.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Notification history API — network first, cache fallback
  if (url.pathname === '/api/dashboard/notifications/logs') {
    event.respondWith(networkFirstLogs(request));
    return;
  }

  // Dashboard navigations — network first with offline fallback
  if (request.mode === 'navigate' && url.pathname.startsWith('/dashboard')) {
    event.respondWith(networkFirstNavigate(request));
  }
});

async function networkFirstLogs(request) {
  const cache = await caches.open(LOGS_CACHE);
  try {
    const fresh = await fetch(request.clone());
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({
        rows: [],
        total: 0,
        limit: 0,
        offset: 0,
        offline: true,
        error: 'Offline — no cached logs for this filter',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-VibeAlerts-Offline': '1' },
      }
    );
  }
}

async function networkFirstNavigate(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match('/offline');
    return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('push', (event) => {
  let data = {
    title: 'VibeAlerts',
    body: 'New alert',
    url: '/dashboard/notifications',
    tag: 'vibealerts',
  };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    try {
      data.body = event.data.text();
    } catch {
      // keep defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'VibeAlerts', {
      body: data.body || 'New alert',
      icon: '/icons/192',
      badge: '/icons/192',
      tag: data.tag || 'vibealerts',
      data: { url: data.url || '/dashboard/notifications' },
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || '/dashboard/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
