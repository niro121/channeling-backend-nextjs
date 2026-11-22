import "server-only"
import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { requireManagementActor } from "@/lib/management-api-route"
import { roomInventoryCan } from "@/lib/room-inventory-access"
import { InventoryError } from "@/services/inventory.service"
import type { ManagementActor } from "@/lib/management-app-auth"

type Need = "view" | "assign" | "condition"

/** Management actor with room-inventory access; `need` adds the write privilege a route requires. */
export async function requireRoomInventoryActor(
  request: Request,
  need: Need = "view"
): Promise<{ actor: ManagementActor; can: ReturnType<typeof roomInventoryCan> } | { response: NextResponse }> {
  // Same gate as the web /room-inventory page (room-inventory.view).
  const auth = await requireManagementActor(request, "/room-inventory")
  if ("response" in auth) return auth
  const can = roomInventoryCan(auth.actor.permissions, auth.actor.isAdmin)
  if (!can[need]) {
    const message =
      need === "assign"
        ? "You don't have permission to manage room inventory."
        : need === "condition"
          ? "You don't have permission to change item condition."
          : "Permission denied"
    return { response: NextResponse.json({ success: false, errorCode: "forbidden", message }, { status: 403 }) }
  }
  return { actor: auth.actor, can }
}

export function roomInventoryError(error: unknown, label: string) {
  if (error instanceof InventoryError) {
    return NextResponse.json({ success: false, errorCode: "invalid_input", message: error.message }, { status: 400 })
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, errorCode: "invalid_input", message: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    )
  }
  console.error(`management room-inventory ${label}`, error)
  return NextResponse.json(
    { success: false, errorCode: "unavailable", message: "Something went wrong. Please try again." },
    { status: 500 }
  )
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null)
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}
