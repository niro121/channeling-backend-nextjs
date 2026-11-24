import { NextResponse } from "next/server"
import { stayContacts } from "@/services/ayu-tools.service"
import { ayuLookup, param, requireAyuTool } from "../../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/ai/stays/contacts?query= — a patient's contacts and primary contact (Ayu tool, stricter privilege). */
export async function GET(request: Request) {
  const auth = await requireAyuTool(request, "contacts")
  if ("response" in auth) return auth.response
  const query = param(request, "query")
  if (!query) return NextResponse.json({ success: false, errorCode: "invalid_input", message: "Say which BHT number, patient or room." }, { status: 400 })
  return ayuLookup(auth.actor, "stay-contacts", { query }, () => stayContacts(query))
}
