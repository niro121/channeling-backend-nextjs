import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { moveInventoryUnits } from "@/services/inventory.service"
import { readJson, requireRoomInventoryActor, roomInventoryError } from "../_shared"

export const dynamic = "force-dynamic"

/**
 * POST /api/management/room-inventory/move
 * Body: { unitIds: string[], toRoomId: string | null, storeLocationId?: string | null, note?: string }
 * toRoomId null returns the units to store. Needs room-inventory.assign.
 */
export async function POST(request: Request) {
  const auth = await requireRoomInventoryActor(request, "assign")
  if ("response" in auth) return auth.response
  const { actor } = auth

  const body = await readJson(request)
  const unitIds = Array.isArray(body.unitIds) ? body.unitIds.map(String) : []
  const toRoomId = typeof body.toRoomId === "string" && body.toRoomId ? body.toRoomId : null

  try {
    const moved = await moveInventoryUnits(
      {
        unitIds,
        toRoomId,
        storeLocationId: typeof body.storeLocationId === "string" ? body.storeLocationId : null,
        note: typeof body.note === "string" ? body.note : null,
      },
      actor.userId
    )
    logActivityNonBlocking({
      userId: actor.userId,
      action: "inventory.unit.moved",
      entityType: "InventoryUnit",
      entityId: unitIds.length === 1 ? unitIds[0] : undefined,
      importance: "medium",
      metadata: { count: moved, toRoomId: toRoomId ?? "store", source: "management-app" },
    })
    return NextResponse.json({ success: true, data: { moved } })
  } catch (error) {
    return roomInventoryError(error, "move")
  }
}
