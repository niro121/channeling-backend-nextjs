import { NextResponse } from "next/server"
import { requireManagementActor } from "@/lib/management-api-route"
import { roomInventoryCan } from "@/lib/room-inventory-access"
import { roomStaysCan } from "@/lib/room-checklist-access"
import { actorTaskPermissions } from "@/services/management/task-access.service"
import { actorAiPermissions } from "@/services/management/ai-access.service"

export const dynamic = "force-dynamic"

/**
 * GET /api/management/me — 200 when this user may use the Management app; 403 no_app_access otherwise.
 * `features` tells the app which optional sections to show (room inventory, room stays); `tasks` and `ai`
 * carry the Task Manager and AI assistant privileges. Each section's API checks again.
 */
export async function GET(request: Request) {
  const auth = await requireManagementActor(request)
  if ("response" in auth) return auth.response
  const { actor } = auth
  const roomInventory = roomInventoryCan(actor.permissions, actor.isAdmin)
  const roomStays = roomStaysCan(actor.permissions, actor.isAdmin)
  return NextResponse.json({
    success: true,
    isAdmin: actor.isAdmin,
    userId: actor.userId,
    features: {
      roomInventory: { view: roomInventory.view, assign: roomInventory.assign, condition: roomInventory.condition },
      roomStays: {
        view: roomStays.view,
        checkIn: roomStays.checkIn,
        checkOut: roomStays.checkOut,
        contacts: roomStays.contacts,
        override: roomStays.override,
      },
    },
    tasks: actorTaskPermissions(actor),
    ai: actorAiPermissions(actor),
  })
}
