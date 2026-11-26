import "server-only"
import webpush from "web-push"
import prisma from "@/lib/prisma"

/**
 * Web Push for the management PWA (apps/management). Ported from klv-caddie's web-push.service.
 * Needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT; without them every send is a no-op.
 * Generate keys with: npx web-push generate-vapid-keys
 */

let configured: boolean | null = null

function ensureConfigured(): boolean {
  if (configured !== null) return configured
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) {
    configured = false
    return false
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:developer@archmage.lk", pub, priv)
  configured = true
  return true
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

export type WebPushSubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export function platformOf(userAgent: string | null | undefined): "ios" | "android" | "desktop" {
  const ua = userAgent ?? ""
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios"
  if (/Android/i.test(ua)) return "android"
  return "desktop"
}

/** Upserted on the endpoint: the same browser re-subscribing, or another user signing in on it, moves the row. */
export async function saveWebPushSubscription(
  userId: string,
  sub: WebPushSubscriptionInput,
  userAgent?: string | null
) {
  const data = {
    userId,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent: userAgent ?? null,
    platform: platformOf(userAgent),
  }
  return prisma.webPushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { endpoint: sub.endpoint, ...data },
    update: data,
  })
}

/** Only removes the caller's own subscription. */
export async function removeWebPushSubscription(userId: string, endpoint: string) {
  await prisma.webPushSubscription.deleteMany({ where: { endpoint, userId } })
}

export type WebPushPayload = {
  title: string
  body: string
  /** Path in the management app to open on tap. */
  url: string
  /** App icon badge count, when known. */
  badge?: number
  /** Same tag replaces the previous notification instead of stacking. */
  tag?: string
}

/** Sends to every subscription of these users. Dead subscriptions (404/410) are deleted. Never throws. */
export async function sendWebPush(
  userIds: string[],
  payload: WebPushPayload
): Promise<{ sent: number; removed: number }> {
  if (userIds.length === 0 || !ensureConfigured()) return { sent: 0, removed: 0 }
  let sent = 0
  let removed = 0
  try {
    const subs = await prisma.webPushSubscription.findMany({ where: { userId: { in: userIds } } })
    const body = JSON.stringify(payload)
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 24 * 3600, urgency: "high" }
          )
          sent++
          await prisma.webPushSubscription
            .update({ where: { id: s.id }, data: { lastUsedAt: new Date() } })
            .catch(() => {})
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await prisma.webPushSubscription.delete({ where: { id: s.id } }).catch(() => {})
            removed++
          } else {
            console.error("[web-push] send failed", status ?? err)
          }
        }
      })
    )
  } catch (err) {
    console.error("[web-push] send error", err)
  }
  return { sent, removed }
}
