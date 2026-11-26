import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { updateStayContacts } from "@/services/room-checklist.service"
import type { StayContactInput } from "@/types/room-checklist"
import { readJson, requireRoomStaysActor, roomStaysError } from "../../_shared"

export const dynamic = "force-dynamic"

/** PATCH /api/management/room-stays/:id/contacts — Body: { patientPhone?, primaryIsPatient, contacts[] } (replaces all). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomStaysActor(request, "contacts")
  if ("response" in auth) return auth.response
  const { id } = await context.params
  const body = await readJson(request)
  try {
    const r = await updateStayContacts(id, {
      patientPhone: typeof body.patientPhone === "string" ? body.patientPhone : null,
      primaryIsPatient: body.primaryIsPatient === true,
      contacts: (Array.isArray(body.contacts) ? body.contacts : []) as StayContactInput[],
    })
    logActivityNonBlocking({
      userId: auth.actor.userId,
      action: "roomStays.contactsUpdated",
      entityType: "RoomStay",
      entityId: id,
      importance: "medium",
      metadata: { ...r, source: "management-app" },
    })
    return NextResponse.json({ success: true, data: r })
  } catch (error) {
    return roomStaysError(error, "contacts")
  }
}
