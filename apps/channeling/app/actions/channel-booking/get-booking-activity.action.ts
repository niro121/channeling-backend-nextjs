"use server"

import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"

export type BookingActivityEntry = {
  id: string
  action: string
  userName: string | null
  createdAt: Date
  metadata: Record<string, unknown> | null
}

/**
 * Get activity log for a booking (e.g. transferred).
 * Used by booking tab Activity trail. Requires channel-booking view.
 */
export async function getBookingActivityForChannelBooking(
  bookingId: string
): Promise<{ success: boolean; data?: BookingActivityEntry[]; message?: string }> {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false, message: "Permission denied", data: [] }
  }

  if (!bookingId) return { success: false, message: "Booking ID required.", data: [] }

  try {
    const activityModel = (prisma as { activityLog?: { findMany: (args: unknown) => Promise<unknown[]> } }).activityLog
    if (!activityModel) return { success: true, data: [] }

    const rows = (await activityModel.findMany({
      where: { entityType: "Booking", entityId: bookingId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true } } },
    })) as { id: string; action: string; createdAt: Date; metadata: unknown; user: { name: string } | null }[]

    const data: BookingActivityEntry[] = rows.map((r) => ({
      id: r.id,
      action: r.action,
      userName: r.user?.name ?? null,
      createdAt: r.createdAt,
      metadata: (r.metadata as Record<string, unknown>) ?? null,
    }))

    return { success: true, data }
  } catch (err) {
    console.error("getBookingActivityForChannelBooking error", err)
    const message = err instanceof Error ? err.message : "Failed to load activity."
    return { success: false, message, data: [] }
  }
}
