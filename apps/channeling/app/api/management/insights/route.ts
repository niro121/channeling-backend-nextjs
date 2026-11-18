import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { allowedInsightModules, resolveInsightRange } from "@/services/management/channel-insights.service"

export const dynamic = "force-dynamic"

/** GET /api/management/insights?from&to — the modules this user may see, and the resolved range. */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const { actor } = auth

  const params = new URL(request.url).searchParams
  const resolved = resolveInsightRange(params.get("from"), params.get("to"))
  if (!resolved.ok) {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: resolved.message }, { status: 400 })
  }
  return NextResponse.json({
    success: true,
    modules: allowedInsightModules(actor.permissions, actor.isAdmin),
    range: resolved.range,
  })
}
