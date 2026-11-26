import { NextResponse } from "next/server"
import {
  listInventoryOptions,
  listInventoryRooms,
  listInventoryUnits,
} from "@/services/inventory.service"
import { requireRoomInventoryActor, roomInventoryError } from "./_shared"

export const dynamic = "force-dynamic"

const OBJECT_ID = /^[a-f0-9]{24}$/i

/**
 * GET /api/management/room-inventory?locationId=
 * Rooms of one branch (default: first branch), every unit in them or in that branch's store,
 * and what the caller may do. Same data as the web /room-inventory board.
 */
export async function GET(request: Request) {
  const auth = await requireRoomInventoryActor(request)
  if ("response" in auth) return auth.response

  try {
    const options = await listInventoryOptions()
    const requested = new URL(request.url).searchParams.get("locationId")
    const locationId =
      requested && OBJECT_ID.test(requested) && options.locations.some((l) => l.id === requested)
        ? requested
        : options.locations[0]?.id ?? null

    const [rooms, units] = await Promise.all([
      listInventoryRooms(locationId),
      listInventoryUnits(locationId ? { locationId } : undefined),
    ])

    return NextResponse.json({
      success: true,
      data: {
        locationId,
        locations: options.locations,
        zones: options.zones.filter((z) => !locationId || z.locationId === locationId),
        departments: options.departments,
        rooms,
        units,
        can: { assign: auth.can.assign, condition: auth.can.condition },
      },
    })
  } catch (error) {
    return roomInventoryError(error, "list")
  }
}
