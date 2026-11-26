import { NextResponse } from "next/server"
import { listInventoryOptions } from "@/services/inventory.service"
import { getStayStats } from "@/services/room-checklist.service"
import { requireRoomStaysActor, roomStaysError } from "../_shared"

export const dynamic = "force-dynamic"

const OBJECT_ID = /^[a-f0-9]{24}$/i

/** GET /api/management/room-stays/stats?locationId=&days=1|7|30 — room statistics for one branch. */
export async function GET(request: Request) {
  const auth = await requireRoomStaysActor(request)
  if ("response" in auth) return auth.response
  try {
    const params = new URL(request.url).searchParams
    const options = await listInventoryOptions()
    const requested = params.get("locationId")
    const locationId =
      requested && OBJECT_ID.test(requested) && options.locations.some((l) => l.id === requested)
        ? requested
        : options.locations[0]?.id ?? null
    const stats = await getStayStats(locationId, Number(params.get("days")) || 1)
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    return roomStaysError(error, "stats")
  }
}
