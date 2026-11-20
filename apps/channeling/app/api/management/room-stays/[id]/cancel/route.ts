import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { cancelStay } from "@/services/room-checklist.service"
import { readJson, requireRoomStaysActor, roomStaysError } from "../../_shared"

export const dynamic = "force-dynamic"

/** POST /api/management/room-stays/:id/cancel — Body: { reason }. A check-in made by mistake; needs Override. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomStaysActor(request, "override")
  if ("response" in auth) return auth.response
  const { id } = await context.params
  const body = await readJson(request)
  const reason = typeof body.reason === "string" ? body.reason : ""
  try {
    const r = await cancelStay(id, reason, auth.actor.userId)
    logActivityNonBlocking({
      userId: auth.actor.userId,
      action: "roomStays.cancelled",
      entityType: "RoomStay",
      entityId: id,
      importance: "high",
      metadata: { ...r, reason, source: "management-app" },
    })
    return NextResponse.json({ success: true, data: r })
  } catch (error) {
    return roomStaysError(error, "cancel")
  }
}
