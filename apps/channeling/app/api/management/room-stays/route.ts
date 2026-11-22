import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { listInventoryOptions } from "@/services/inventory.service"
import { checkInPatient, listStayRooms } from "@/services/room-checklist.service"
import type { StayPatientInput } from "@/types/room-checklist"
import { readJson, requireRoomStaysActor, roomStaysError } from "./_shared"

export const dynamic = "force-dynamic"

const OBJECT_ID = /^[a-f0-9]{24}$/i

/** GET /api/management/room-stays?locationId= — rooms of one branch with who is in them, and what the caller may do. */
export async function GET(request: Request) {
  const auth = await requireRoomStaysActor(request)
  if ("response" in auth) return auth.response
  try {
    const options = await listInventoryOptions()
    const requested = new URL(request.url).searchParams.get("locationId")
    const locationId =
      requested && OBJECT_ID.test(requested) && options.locations.some((l) => l.id === requested)
        ? requested
        : options.locations[0]?.id ?? null
    const rooms = await listStayRooms(locationId)
    const { view, checkIn, checkOut, contacts, override } = auth.can
    return NextResponse.json({
      success: true,
      data: {
        locationId,
        locations: options.locations,
        rooms,
        can: { view, checkIn, checkOut, contacts, override },
      },
    })
  } catch (error) {
    return roomStaysError(error, "list")
  }
}

/**
 * POST /api/management/room-stays — check a patient in.
 * Body: { roomId, patient: { patientName, bhtNumber, patientPhone?, primaryIsPatient, contacts[] }, answers[], overrideReason? }
 * 422 needs_override when a "must pass" item failed and no override reason was given.
 */
export async function POST(request: Request) {
  const auth = await requireRoomStaysActor(request, "checkIn")
  if ("response" in auth) return auth.response
  const body = await readJson(request)
  try {
    const result = await checkInPatient(
      {
        roomId: String(body.roomId ?? ""),
        patient: (body.patient ?? {}) as StayPatientInput,
        answers: body.answers,
        overrideReason: typeof body.overrideReason === "string" ? body.overrideReason : null,
      },
      auth.checklistActor
    )
    logActivityNonBlocking({
      userId: auth.actor.userId,
      action: "roomStays.checkedIn",
      entityType: "RoomStay",
      entityId: result.stayId,
      importance: "high",
      metadata: { roomId: body.roomId, issues: result.issues.length, overridden: Boolean(body.overrideReason), source: "management-app" },
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return roomStaysError(error, "check-in")
  }
}
