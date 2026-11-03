import "server-only"
import { NextResponse } from "next/server"
import { canAccessRoute } from "@/lib/permissions"
import { getManagementActor, type ManagementActor } from "@/lib/management-app-auth"

/**
 * Auth for every /api/management/* route: a valid management user token, the
 * management-app.access privilege (else 403 "no_app_access"), plus the same route gate
 * the web app applies (checkRouteAccess). Business rules stay in the services.
 */
export async function requireManagementActor(
  request: Request,
  /** Web-app route this endpoint mirrors; omit for user-level endpoints (e.g. push settings). */
  route?: string
): Promise<{ actor: ManagementActor } | { response: NextResponse }> {
  const actor = await getManagementActor(request.headers)
  if (!actor) {
    return { response: NextResponse.json({ success: false, errorCode: "unauthorized", message: "Unauthorized" }, { status: 401 }) }
  }
  if (!actor.hasAppAccess) {
    return {
      response: NextResponse.json(
        { success: false, errorCode: "no_app_access", message: "You don't have access to the Management app." },
        { status: 403 }
      ),
    }
  }
  if (route && !actor.isAdmin && !canAccessRoute(actor.permissions, route)) {
    return { response: NextResponse.json({ success: false, errorCode: "forbidden", message: "Permission denied" }, { status: 403 }) }
  }
  return { actor }
}
