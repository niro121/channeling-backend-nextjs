import { roomStatistics } from "@/services/ayu-tools.service"
import { ayuLookup, param, requireAyuTool } from "../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/ai/room-stats?days=1|7|30 — occupancy and activity per branch (Ayu tool). */
export async function GET(request: Request) {
  const auth = await requireAyuTool(request, "room-stays")
  if ("response" in auth) return auth.response
  const days = Number(param(request, "days")) || 1
  return ayuLookup(auth.actor, "room-stats", { days }, () => roomStatistics(days))
}
