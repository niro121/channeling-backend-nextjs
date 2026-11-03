"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getChannelRoomDoctorSessionsService } from "@/services/channel-room/get-channel-room-doctor-sessions.service"

export async function getChannelRoomDoctorSessionsAction(
  doctorId: string,
  date: Date | string,
  locationId?: string | null
) {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false as const, message: "Permission denied" }
  }
  return getChannelRoomDoctorSessionsService(doctorId, date, locationId)
}
