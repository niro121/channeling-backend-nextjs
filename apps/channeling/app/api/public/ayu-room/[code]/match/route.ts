import { NextResponse } from "next/server"
import { matchRoomPhone } from "@/services/room-ayu.service"
import { body, roomError, roomKeyDenied } from "../../_shared"

export const dynamic = "force-dynamic"

/**
 * POST /api/public/ayu-room/:code/match { phone } — after the caller has verified the phone by SMS:
 * is it the patient's or an authorised contact's on this room's current stay?
 */
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const denied = roomKeyDenied(request)
  if (denied) return denied
  const b = await body(request)
  try {
    return NextResponse.json({ success: true, data: await matchRoomPhone((await ctx.params).code, String(b.phone ?? "")) })
  } catch (error) {
    return roomError(error, "match")
  }
}
