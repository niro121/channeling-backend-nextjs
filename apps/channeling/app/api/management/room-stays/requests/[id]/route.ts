import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import prisma from "@/lib/prisma"
import { RoomAyuError, updateRoomRequestStatus } from "@/services/room-ayu.service"
import { readJson, requireRoomStaysActor, roomStaysError } from "../../_shared"

export const dynamic = "force-dynamic"

/** PATCH /api/management/room-stays/requests/:id { status, note? } — a GRO (check-in or check-out privilege) moves a patient request along. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomStaysActor(request, "write")
  if ("response" in auth) return auth.response
  const { id } = await context.params
  const body = await readJson(request)
  try {
    const user = await prisma.user.findUnique({ where: { id: auth.actor.userId }, select: { name: true } })
    const r = await updateRoomRequestStatus(
      id,
      { status: String(body.status ?? ""), note: typeof body.note === "string" ? body.note : null },
      { id: auth.actor.userId, name: user?.name ?? null }
    )
    logActivityNonBlocking({
      userId: auth.actor.userId,
      action: "roomStays.requestUpdated",
      entityType: "RoomRequest",
      entityId: id,
      importance: "low",
      metadata: { status: r.request.status, stayId: r.stayId, source: "management-app" },
    })
    return NextResponse.json({ success: true, data: r.request })
  } catch (error) {
    if (error instanceof RoomAyuError) {
      return NextResponse.json({ success: false, errorCode: error.code, message: error.message }, { status: error.code === "not_found" ? 404 : 400 })
    }
    return roomStaysError(error, "request-status")
  }
}
