"use server"

import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import {
  setChannelRoomAttendanceService,
  type SetChannelRoomAttendanceInput,
  type SetChannelRoomAttendanceResult,
} from "@/services/channel-room/set-channel-room-attendance.service"

export async function setChannelRoomAttendanceAction(
  input: SetChannelRoomAttendanceInput
): Promise<SetChannelRoomAttendanceResult> {
  try {
    await requirePermission("channel-booking", "edit")
  } catch {
    return { success: false, errorCode: "forbidden", message: "Permission denied" }
  }

  const session = await fetchServerSession()
  const userId = session?.user?.id
  if (!userId) {
    return { success: false, errorCode: "unauthorized", message: "You must be logged in." }
  }

  return setChannelRoomAttendanceService(input, userId)
}
