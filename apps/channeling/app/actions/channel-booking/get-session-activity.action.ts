"use server"

import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"

export type SessionActivityEntry = {
  id: string
  action: string
  userName: string | null
  createdAt: Date
  metadata: Record<string, unknown> | null
}

/**
 * Get activity log for a session (e.g. transfers in/out).
 * Used by channel-booking History button. Requires channel-booking view.
 */
export async function getSessionActivityForChannelBooking(
  sessionId: string
): Promise<{ success: boolean; data?: SessionActivityEntry[]; message?: string }> {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false, message: "Permission denied", data: [] }
  }

  if (!sessionId) return { success: false, message: "Session ID required.", data: [] }

  try {
    const activityModel = (prisma as { activityLog?: { findMany: (args: unknown) => Promise<unknown[]> } }).activityLog
    if (!activityModel) return { success: true, data: [] }

    const rows = (await activityModel.findMany({
      where: { entityType: "Session", entityId: sessionId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true } } },
    })) as { id: string; action: string; createdAt: Date; metadata: unknown; user: { name: string } | null }[]

    const data: SessionActivityEntry[] = rows.map((r) => ({
      id: r.id,
      action: r.action,
      userName: r.user?.name ?? null,
      createdAt: r.createdAt,
      metadata: (r.metadata as Record<string, unknown>) ?? null,
    }))

    return { success: true, data }
  } catch (err) {
    console.error("getSessionActivityForChannelBooking error", err)
    const message = err instanceof Error ? err.message : "Failed to load activity."
    return { success: false, message, data: [] }
  }
}
