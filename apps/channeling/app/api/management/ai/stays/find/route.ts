import { NextResponse } from "next/server"
import { findStays } from "@/services/ayu-tools.service"
import { ayuLookup, param, requireAyuTool } from "../../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/ai/stays/find?query= — a stay by BHT, patient name or room, with its checklists (Ayu tool). */
export async function GET(request: Request) {
  const auth = await requireAyuTool(request, "room-stays")
  if ("response" in auth) return auth.response
  const query = param(request, "query")
  if (!query) return NextResponse.json({ success: false, errorCode: "invalid_input", message: "Say which BHT number, patient or room." }, { status: 400 })
  return ayuLookup(auth.actor, "find-stay", { query }, () => findStays(query))
}
