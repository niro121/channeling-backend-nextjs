import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import prisma from "@/lib/prisma"
import { updateConcernStatus } from "@/services/room-concerns.service"
import { readJson, requireRoomStaysActor } from "../../_shared"

export const dynamic = "force-dynamic"

/** PATCH /api/management/room-stays/concerns/:id { status: open|looking|resolved, note? } — a GRO handles a concern. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomStaysActor(request, "write")
  if ("response" in auth) return auth.response
  const { id } = await context.params
  const b = await readJson(request)
  try {
    const user = await prisma.user.findUnique({ where: { id: auth.actor.userId }, select: { name: true } })
    const r = await updateConcernStatus(id, { status: String(b.status ?? ""), note: typeof b.note === "string" ? b.note : null }, { id: auth.actor.userId, name: user?.name ?? null })
    logActivityNonBlocking({
      userId: auth.actor.userId,
      action: "roomStays.concernUpdated",
      entityType: "RoomConcern",
      entityId: id,
      importance: "medium",
      metadata: { status: r.concern.status, stayId: r.stayId, source: "management-app" },
    })
    return NextResponse.json({ success: true, data: r.concern })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update the concern."
    return NextResponse.json({ success: false, errorCode: "invalid_input", message }, { status: 400 })
  }
}
