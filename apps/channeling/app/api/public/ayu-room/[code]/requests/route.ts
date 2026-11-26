import { NextResponse } from "next/server"
import { createRoomRequest } from "@/services/room-ayu.service"
import { body, roomError, roomKeyDenied } from "../../_shared"

export const dynamic = "force-dynamic"

/** POST /api/public/ayu-room/:code/requests { stayId, phone, category, details? } — a patient's request; GROs are told. */
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const denied = roomKeyDenied(request)
  if (denied) return denied
  const b = await body(request)
  try {
    const row = await createRoomRequest({
      code: (await ctx.params).code,
      stayId: String(b.stayId ?? ""),
      phone: String(b.phone ?? ""),
      category: String(b.category ?? ""),
      details: typeof b.details === "string" ? b.details : null,
    })
    return NextResponse.json({ success: true, data: row })
  } catch (error) {
    return roomError(error, "request")
  }
}
