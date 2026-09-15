// OneSignal Service Worker Integration & Auto-Updating Support
// This file resides in public/ to be served at the root of your domain.

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Auto-activate new service worker versions immediately for iOS and standalone PWAs
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
