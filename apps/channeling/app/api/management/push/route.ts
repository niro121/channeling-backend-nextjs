import { NextResponse } from "next/server"
import { z } from "zod"
import { requireManagementActor } from "@/lib/management-api-route"
import { pendingApprovalCount } from "@/services/notification-push.service"
import {
  removeWebPushSubscription,
  saveWebPushSubscription,
  sendWebPush,
  vapidPublicKey,
} from "@/services/web-push.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** GET /api/management/push — whether push is set up, the VAPID public key, and the badge count. */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const publicKey = vapidPublicKey()
  return NextResponse.json({
    enabled: !!publicKey,
    publicKey,
    badge: await pendingApprovalCount(auth.actor.userId),
  })
}

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
})

/**
 * POST /api/management/push — body { action: "subscribe", subscription, userAgent }
 * | { action: "unsubscribe", endpoint } | { action: "test" }.
 */
export async function POST(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const { actor } = auth

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  switch (body?.action) {
    case "subscribe": {
      const parsed = subscriptionSchema.safeParse(body.subscription)
      if (!parsed.success) {
        return NextResponse.json({ success: false, message: "Invalid subscription" }, { status: 400 })
      }
      const userAgent = typeof body.userAgent === "string" ? body.userAgent.slice(0, 500) : null
      await saveWebPushSubscription(actor.userId, parsed.data, userAgent)
      return NextResponse.json({ success: true })
    }
    case "unsubscribe": {
      if (typeof body.endpoint !== "string" || !body.endpoint) {
        return NextResponse.json({ success: false, message: "endpoint is required" }, { status: 400 })
      }
      await removeWebPushSubscription(actor.userId, body.endpoint)
      return NextResponse.json({ success: true })
    }
    case "test": {
      const result = await sendWebPush([actor.userId], {
        title: "Notifications are working",
        body: "You'll get approval requests here.",
        url: "/approvals",
        badge: await pendingApprovalCount(actor.userId),
        tag: "test",
      })
      return NextResponse.json({ success: true, ...result })
    }
    default:
      return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 })
  }
}
