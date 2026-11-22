import { NextResponse } from "next/server"
import { listRoomRequestsForPatient } from "@/services/room-ayu.service"
import { body, roomError, roomKeyDenied } from "../../../_shared"

export const dynamic = "force-dynamic"

/** POST /api/public/ayu-room/:code/requests/list { stayId, phone } — this stay's requests and their status (POST keeps the phone out of URLs). */
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const denied = roomKeyDenied(request)
  if (denied) return denied
  const b = await body(request)
  try {
    const rows = await listRoomRequestsForPatient({ code: (await ctx.params).code, stayId: String(b.stayId ?? ""), phone: String(b.phone ?? "") })
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    return roomError(error, "list")
  }
}
