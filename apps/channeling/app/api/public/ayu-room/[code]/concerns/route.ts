import { NextResponse } from "next/server"
import { raiseConcernFromRoom } from "@/services/room-ayu.service"
import { body, roomError, roomKeyDenied } from "../../_shared"

export const dynamic = "force-dynamic"

/** POST /api/public/ayu-room/:code/concerns { stayId, phone, level, kind, summary, quote? } — Inward Ayu raises a concern for the GROs. */
export async function POST(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const denied = roomKeyDenied(request)
  if (denied) return denied
  const b = await body(request)
  try {
    const row = await raiseConcernFromRoom({
      code: (await ctx.params).code,
      stayId: String(b.stayId ?? ""),
      phone: String(b.phone ?? ""),
      level: String(b.level ?? "attention"),
      kind: String(b.kind ?? "other"),
      summary: String(b.summary ?? ""),
      quote: typeof b.quote === "string" ? b.quote : null,
      source: typeof b.source === "string" ? b.source : null,
    })
    return NextResponse.json({ success: true, data: row })
  } catch (error) {
    return roomError(error, "concern")
  }
}
