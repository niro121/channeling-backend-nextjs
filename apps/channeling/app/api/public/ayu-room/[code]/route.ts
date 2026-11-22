import { NextResponse } from "next/server"
import { publicRoomInfo } from "@/services/room-ayu.service"
import { roomError, roomKeyDenied } from "../_shared"

export const dynamic = "force-dynamic"

/** GET /api/public/ayu-room/:code — the room behind a QR code (no patient details). */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const denied = roomKeyDenied(request)
  if (denied) return denied
  try {
    return NextResponse.json({ success: true, data: await publicRoomInfo((await ctx.params).code) })
  } catch (error) {
    return roomError(error, "info")
  }
}
