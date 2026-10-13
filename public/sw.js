const CACHE_NAME = 'she-pwa-shell-v1';
self.addEventListener('install', (event) => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
