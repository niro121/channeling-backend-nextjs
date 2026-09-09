"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getChannelRoomDashboardService } from "@/services/channel-room/get-channel-room-dashboard.service"

export async function getChannelRoomDashboardAction(input?: {
  date?: Date | string
  locationId?: string | null
}) {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false as const, message: "Permission denied" }
  }
  return getChannelRoomDashboardService({
    date: input?.date,
    locationId: input?.locationId,
  })
}
