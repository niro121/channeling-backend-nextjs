import { BUILD_ID } from '@/lib/pwa/version';

export const dynamic = 'force-static';

/**
 * The service worker, served from a route so every build stamps its BUILD_ID in. Each deploy is
 * then a byte change, so browsers install the new worker (and drop the old cache) by themselves.
 */
const SOURCE = String.raw`/*
 * Management PWA service worker (served by app/sw.js/route.ts with the build id stamped in). Keeps it installable and quick: hashed build files
 * (/_next/static) and icons are cached once and served from cache; pages go to the network,
 * with a small offline page when there's none. Statistics are never cached on the device.
 * Also shows Web Push notifications (approvals), sets the app icon badge, and opens the
 * right screen when one is tapped.
 */
const BUILD_ID = __BUILD_ID__
const STATIC_CACHE = "management-static-" + BUILD_ID // new build → new cache; the old one is dropped on activate
const OFFLINE_URL = "/offline.html"

// On localhost file names don't change between edits, so caching them would serve stale code.
const IS_DEV = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"])))
  // First install: take over straight away. An update waits until the app says "SKIP_WAITING"
  // (the Update button, or a forced update), so an open screen keeps the files it was built with.
  if (!self.registration.active) self.skipWaiting()
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (!IS_DEV && (url.pathname.startsWith("/_next/static/") || /^\/(icon-|apple-touch-icon)/.test(url.pathname))) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      })
    )
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
  }
})

// ── Notifications ────────────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: "Management", body: event.data ? event.data.text() : "" }
  }
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || undefined,
    renotify: !!payload.tag,
    data: { url: payload.url || "/approvals" },
  }
  const tasks = [self.registration.showNotification(payload.title || "Management", options)]
  if (typeof payload.badge === "number" && "setAppBadge" in self.navigator) {
    tasks.push(
      (payload.badge > 0 ? self.navigator.setAppBadge(payload.badge) : self.navigator.clearAppBadge()).catch(() => {})
    )
  }
  event.waitUntil(Promise.all(tasks))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/approvals", self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      // Reuse an open app window: bring it forward and send it to the screen.
      const app = clients.find((c) => new URL(c.url).origin === self.location.origin)
      if (app) {
        await app.focus()
        if ("navigate" in app) return app.navigate(target).catch(() => self.clients.openWindow(target))
        return undefined
      }
      return self.clients.openWindow(target)
    })
  )
})

// The push service rotated this browser's subscription: re-register it so notifications keep
// arriving without anyone turning them on again.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const keyRes = await fetch("/api/push", { credentials: "same-origin" })
      const { publicKey } = await keyRes.json()
      if (!publicKey) return
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })
      await fetch("/api/push", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", subscription: sub.toJSON(), userAgent: self.navigator.userAgent }),
      })
    })().catch(() => {})
  )
})
`;

export function GET() {
  return new Response(SOURCE.replace('__BUILD_ID__', JSON.stringify(BUILD_ID)), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Browsers must always re-check the worker script.
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/'
    }
  });
}
