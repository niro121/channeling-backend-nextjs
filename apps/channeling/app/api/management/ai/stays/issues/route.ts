import { recentIssues } from "@/services/ayu-tools.service"
import { ayuLookup, param, requireAyuTool } from "../../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/ai/stays/issues?days=7 — checklists with issues (Ayu tool). */
export async function GET(request: Request) {
  const auth = await requireAyuTool(request, "room-stays")
  if ("response" in auth) return auth.response
  const days = Number(param(request, "days")) || 7
  return ayuLookup(auth.actor, "stay-issues", { days }, () => recentIssues(days))
}
