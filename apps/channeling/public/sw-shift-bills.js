self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Network-only: do not cache HTML, JS, or authenticated photo routes.
self.addEventListener("fetch", () => {})
