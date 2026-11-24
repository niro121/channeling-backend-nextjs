import { currentStays } from "@/services/ayu-tools.service"
import { ayuLookup, param, requireAyuTool } from "../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/ai/stays?query=&issuesOnly=1 — patients in a room now (Ayu tool). */
export async function GET(request: Request) {
  const auth = await requireAyuTool(request, "room-stays")
  if ("response" in auth) return auth.response
  const query = param(request, "query")
  const issuesOnly = param(request, "issuesOnly") === "1"
  return ayuLookup(auth.actor, "current-stays", { query, issuesOnly }, () => currentStays({ query, issuesOnly }))
}
