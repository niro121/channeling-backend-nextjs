import { NextResponse } from "next/server"
import { getStayDetail } from "@/services/room-checklist.service"
import { requireRoomStaysActor, roomStaysError } from "../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/room-stays/:id — the stay, its contacts and filled checklists. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomStaysActor(request)
  if ("response" in auth) return auth.response
  const { id } = await context.params
  try {
    const stay = await getStayDetail(id)
    if (!stay) return NextResponse.json({ success: false, errorCode: "not_found", message: "Stay not found." }, { status: 404 })
    const { checkOut, contacts, override } = auth.can
    return NextResponse.json({ success: true, data: { stay, can: { checkOut, contacts, override } } })
  } catch (error) {
    return roomStaysError(error, "detail")
  }
}
