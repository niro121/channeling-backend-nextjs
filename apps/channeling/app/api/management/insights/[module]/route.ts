import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import {
  allowedInsightModules,
  getChannelInsight,
  isInsightModule,
  resolveInsightRange,
} from "@/services/management/channel-insights.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/management/insights/:module?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Needs management-overview.<module> in the user's channeling group (admins see all).
 */
export async function GET(request: Request, context: { params: Promise<{ module: string }> }) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const { actor } = auth

  const { module } = await context.params
  if (!isInsightModule(module)) {
    return NextResponse.json({ success: false, errorCode: "not_found", message: "Unknown module" }, { status: 404 })
  }
  if (!allowedInsightModules(actor.permissions, actor.isAdmin).includes(module)) {
    return NextResponse.json({ success: false, errorCode: "forbidden", message: "Permission denied" }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const resolved = resolveInsightRange(params.get("from"), params.get("to"))
  if (!resolved.ok) {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: resolved.message }, { status: 400 })
  }

  try {
    const data = await getChannelInsight(module, resolved.range)
    return NextResponse.json({ success: true, range: resolved.range, data })
  } catch (error) {
    console.error(`management insights ${module}`, error)
    return NextResponse.json(
      { success: false, errorCode: "server_error", message: "Could not load this module." },
      { status: 500 }
    )
  }
}
