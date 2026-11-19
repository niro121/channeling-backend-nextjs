import { NextResponse } from "next/server"
import { listInventoryUnitHistory } from "@/services/inventory.service"
import { requireRoomInventoryActor, roomInventoryError } from "../../../_shared"

export const dynamic = "force-dynamic"

/** GET /api/management/room-inventory/units/:id/history — moves and condition changes, newest first. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoomInventoryActor(request)
  if ("response" in auth) return auth.response
  const { id } = await context.params
  try {
    return NextResponse.json({ success: true, data: await listInventoryUnitHistory(id) })
  } catch (error) {
    return roomInventoryError(error, "history")
  }
}
