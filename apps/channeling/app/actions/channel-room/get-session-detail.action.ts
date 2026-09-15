"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getChannelRoomSessionDetailService } from "@/services/channel-room/get-channel-room-session-detail.service"

export async function getChannelRoomSessionDetailAction(sessionId: string) {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false as const, message: "Permission denied" }
  }
  return getChannelRoomSessionDetailService(sessionId)
}
