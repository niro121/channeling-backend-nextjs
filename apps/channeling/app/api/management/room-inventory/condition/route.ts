import { NextResponse } from "next/server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { setInventoryUnitsCondition } from "@/services/inventory.service"
import { inventoryConditionMeta } from "@/types/inventory"
import { readJson, requireRoomInventoryActor, roomInventoryError } from "../_shared"

export const dynamic = "force-dynamic"

/**
 * POST /api/management/room-inventory/condition
 * Body: { unitIds: string[], condition: 0|1|2|3|4, note?: string }
 * Needs room-inventory.assign or inventory.edit.
 */
export async function POST(request: Request) {
  const auth = await requireRoomInventoryActor(request, "condition")
  if ("response" in auth) return auth.response
  const { actor } = auth

  const body = await readJson(request)
  const unitIds = Array.isArray(body.unitIds) ? body.unitIds.map(String) : []
  const condition = Number(body.condition)

  try {
    const changed = await setInventoryUnitsCondition(
      unitIds,
      condition,
      typeof body.note === "string" ? body.note : null,
      actor.userId
    )
    logActivityNonBlocking({
      userId: actor.userId,
      action: "inventory.unit.conditionChanged",
      entityType: "InventoryUnit",
      entityId: unitIds.length === 1 ? unitIds[0] : undefined,
      importance: "medium",
      metadata: { count: changed, to: inventoryConditionMeta(condition).label, source: "management-app" },
    })
    return NextResponse.json({ success: true, data: { changed } })
  } catch (error) {
    return roomInventoryError(error, "condition")
  }
}
