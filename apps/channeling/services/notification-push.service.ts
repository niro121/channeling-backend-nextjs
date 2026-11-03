import "server-only"
import { getActorByUserId } from "@/lib/management-app-auth"
import { listApprovalRequests } from "@/services/approval-request.service"
import { sendWebPush } from "@/services/web-push.service"
import { REFERENCE_TYPES, type NotificationCreateInput } from "@/types/notification"

/**
 * Turns an in-app notification into a management PWA push. Only notifications the
 * management app has a screen for are pushed (approvals today); add more here as it grows.
 */
function managementUrlFor(input: NotificationCreateInput): string | null {
  if (input.referenceType === REFERENCE_TYPES.ApprovalRequest && input.referenceId) {
    return `/approvals?id=${input.referenceId}`
  }
  return null
}

/** Requests waiting for this user in the Approval Center — the app icon badge. */
export async function pendingApprovalCount(userId: string): Promise<number> {
  const actor = await getActorByUserId(userId)
  if (!actor) return 0
  const result = await listApprovalRequests({
    view: "attend",
    limit: 10,
    userId: actor.userId,
    permissions: actor.permissions,
    isAdmin: actor.isAdmin,
  })
  return result.success ? result.total : 0
}

export async function pushNotification(input: NotificationCreateInput): Promise<void> {
  const url = managementUrlFor(input)
  if (!url) return
  try {
    // No pushes once someone loses Management app access (their devices may still be subscribed).
    const actor = await getActorByUserId(input.userId)
    if (!actor?.hasAppAccess) return
    await sendWebPush([input.userId], {
      title: input.title,
      body: input.message ?? "",
      url,
      badge: await pendingApprovalCount(input.userId),
      tag: input.referenceId ? `${input.referenceType}:${input.referenceId}` : undefined,
    })
  } catch (e) {
    console.error("pushNotification error:", e)
  }
}
