import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { checkOutPatient } from "@/services/room-checklist.service"
import { readJson, requireRoomStaysActor, roomStaysError } from "../../_shared"

export const dynamic = "force-dynamic"

/** POST /api/management/room-stays/:id/check-out — Body: { answers[], overrideReason? }. Closes the stay. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomStaysActor(request, "checkOut")
  if ("response" in auth) return auth.response
  const { id } = await context.params
  const body = await readJson(request)
  try {
    const result = await checkOutPatient(
      id,
      { answers: body.answers, overrideReason: typeof body.overrideReason === "string" ? body.overrideReason : null },
      auth.checklistActor
    )
    logActivityNonBlocking({
      userId: auth.actor.userId,
      action: "roomStays.checkedOut",
      entityType: "RoomStay",
      entityId: id,
      importance: "high",
      metadata: { issues: result.issues.length, overridden: Boolean(body.overrideReason), source: "management-app" },
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return roomStaysError(error, "check-out")
  }
}
