const CACHE_NAME = 'she-pwa-shell-v3';
self.addEventListener('install', (event) => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data ? event.data.text() : '' }; }
  const title = payload.title || 'She Afiliadas';
  const options = {
    body: payload.body || 'Você tem uma novidade no seu painel de afiliada.',
    icon: payload.icon || '/pwa-icon-192.png',
    badge: payload.badge || '/pwa-icon-192.png',
    data: { url: payload.url || '/afiliado', ...(payload.data || {}) },
    tag: payload.tag || undefined,
    renotify: Boolean(payload.renotify),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/afiliado', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow ? self.clients.openWindow(target) : undefined;
  }));
});
