import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { actorTaskPermissions } from "@/services/management/task-access.service"
import { actorAiPermissions } from "@/services/management/ai-access.service"

export const dynamic = "force-dynamic"

/**
 * GET /api/management/me — 200 when this user may use the Management app; 403 no_app_access otherwise.
 * Also returns the user's Task Manager and AI assistant privileges (decided here, enforced by the management app).
 */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  return NextResponse.json({
    success: true,
    isAdmin: auth.actor.isAdmin,
    userId: auth.actor.userId,
    tasks: actorTaskPermissions(auth.actor),
    ai: actorAiPermissions(auth.actor),
  })
}
