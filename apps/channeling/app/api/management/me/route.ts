import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"

export const dynamic = "force-dynamic"

/** GET /api/management/me — 200 when this user may use the Management app; 403 no_app_access otherwise. */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  return NextResponse.json({ success: true, isAdmin: auth.actor.isAdmin })
}
