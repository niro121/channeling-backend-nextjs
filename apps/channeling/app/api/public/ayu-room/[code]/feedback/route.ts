import { NextResponse } from "next/server"
import { feedbackFromRoom } from "@/services/room-ayu.service"
import { body, roomError, roomKeyDenied } from "../../_shared"

export const dynamic = "force-dynamic"

/** POST /api/public/ayu-room/:code/feedback { stayId, phone, rating 1-5, comment? } — how they rate their stay. */
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const denied = roomKeyDenied(request)
  if (denied) return denied
  const b = await body(request)
  try {
    const row = await feedbackFromRoom({
      code: (await ctx.params).code,
      stayId: String(b.stayId ?? ""),
      phone: String(b.phone ?? ""),
      rating: Number(b.rating),
      comment: typeof b.comment === "string" ? b.comment : null,
    })
    return NextResponse.json({ success: true, data: row })
  } catch (error) {
    return roomError(error, "feedback")
  }
}
