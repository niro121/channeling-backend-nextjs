import { NextResponse } from "next/server"
import { buildChecklistForm } from "@/services/room-checklist.service"
import { requireRoomStaysActor, roomStaysError } from "../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/room-stays/form?roomId=&kind=check_in|check_out&stayId= — the form to fill, ready to show. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const kind = params.get("kind") === "check_out" ? "check_out" : "check_in"
  const auth = await requireRoomStaysActor(request, kind === "check_in" ? "checkIn" : "checkOut")
  if ("response" in auth) return auth.response
  try {
    const form = await buildChecklistForm(params.get("roomId") ?? "", kind, params.get("stayId"))
    return NextResponse.json({ success: true, data: form })
  } catch (error) {
    return roomStaysError(error, "form")
  }
}
