import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { roomInventoryCan } from "@/lib/room-inventory-access"

export const dynamic = "force-dynamic"

/**
 * GET /api/management/me — 200 when this user may use the Management app; 403 no_app_access otherwise.
 * `features` tells the app which optional sections (☰ menu) to show; each section's API checks again.
 */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const { actor } = auth
  const roomInventory = roomInventoryCan(actor.permissions, actor.isAdmin)
  return NextResponse.json({
    success: true,
    isAdmin: actor.isAdmin,
    features: {
      roomInventory: { view: roomInventory.view, assign: roomInventory.assign, condition: roomInventory.condition },
    },
  })
}
