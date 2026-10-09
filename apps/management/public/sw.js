// Management PWA service worker. Makes the app installable; deliberately network-only
// so authenticated statistics are never cached on the device.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", () => {})
