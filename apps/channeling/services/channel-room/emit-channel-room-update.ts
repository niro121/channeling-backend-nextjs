import { channelRoomSocketRooms, getIO } from "@/lib/socket-server"

export type ChannelRoomSocketPayload = {
  kind: "attendance" | "sessions"
  sessionId: string
  channelCurrentPatientNumber?: number
  institution: number
  locationId: string | null
}

export function emitChannelRoomUpdate(payload: ChannelRoomSocketPayload): void {
  const io = getIO()
  if (!io) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[channel-room] emit skipped: getIO() is null")
    }
    return
  }
  const rooms = channelRoomSocketRooms({
    locationId: payload.locationId,
    institution: payload.institution,
  })
  for (const room of rooms) {
    io.to(room).emit("channel-room-update", payload)
  }
  if (process.env.NODE_ENV !== "production") {
    console.log("[channel-room] emitted", { rooms, payload })
  }
}
