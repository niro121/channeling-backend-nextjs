import "server-only"
import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"
import { RoomAyuError } from "@/services/room-ayu.service"

/**
 * In-room Ayu routes are called only by the Ruhunu AI caddie (room page) and Ayu, with
 * X-Ayu-Room-Key = AYU_ROOM_SERVICE_KEY. Not the general public API clients: these routes
 * check phones against patients' stays.
 */
export function roomKeyDenied(request: Request): NextResponse | null {
  const expected = process.env.AYU_ROOM_SERVICE_KEY?.trim()
  const sent = request.headers.get("x-ayu-room-key")?.trim() ?? ""
  if (!expected || expected.length < 16) {
    return NextResponse.json({ success: false, errorCode: "not_configured", message: "In-room Ayu is not configured." }, { status: 503 })
  }
  const a = Buffer.from(sent)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ success: false, errorCode: "unauthorized", message: "Unauthorized" }, { status: 401 })
  }
  return null
}

const STATUS: Record<RoomAyuError["code"], number> = { invalid_input: 400, not_found: 404, not_on_stay: 403, forbidden: 403 }

export function roomError(error: unknown, label: string) {
  if (error instanceof RoomAyuError) {
    return NextResponse.json({ success: false, errorCode: error.code, message: error.message }, { status: STATUS[error.code] })
  }
  console.error(`ayu-room ${label}`, error)
  return NextResponse.json({ success: false, errorCode: "unavailable", message: "Something went wrong. Please try again." }, { status: 500 })
}

export async function body(request: Request): Promise<Record<string, unknown>> {
  const b = await request.json().catch(() => null)
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {}
}
