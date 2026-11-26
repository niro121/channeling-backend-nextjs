import "server-only"
import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { requireManagementActor } from "@/lib/management-api-route"
import { roomStaysCan } from "@/lib/room-checklist-access"
import { ChecklistError, type ChecklistActor } from "@/services/room-checklist.service"
import type { ManagementActor } from "@/lib/management-app-auth"

type Need = "view" | "checkIn" | "checkOut" | "contacts" | "override" | "write"

const DENIED: Record<Need, string> = {
  view: "You don't have permission to see room stays.",
  checkIn: "You don't have permission to check patients in.",
  checkOut: "You don't have permission to check patients out.",
  contacts: "You don't have permission to edit patient contacts.",
  override: "You don't have permission to override or cancel a check-in.",
  write: "You don't have permission to fill checklists.",
}

/** Management actor with room-stays access; `need` is the privilege the route requires ("write" = check-in or check-out). */
export async function requireRoomStaysActor(
  request: Request,
  need: Need = "view"
): Promise<
  | { actor: ManagementActor; can: ReturnType<typeof roomStaysCan>; checklistActor: ChecklistActor }
  | { response: NextResponse }
> {
  const auth = await requireManagementActor(request, "/room-stays")
  if ("response" in auth) return auth
  const can = roomStaysCan(auth.actor.permissions, auth.actor.isAdmin)
  const ok = need === "write" ? can.checkIn || can.checkOut : can[need]
  if (!ok) {
    return { response: NextResponse.json({ success: false, errorCode: "forbidden", message: DENIED[need] }, { status: 403 }) }
  }
  return {
    actor: auth.actor,
    can,
    checklistActor: {
      userId: auth.actor.userId,
      permissions: auth.actor.permissions,
      isAdmin: auth.actor.isAdmin,
      canOverride: can.override,
    },
  }
}

const STATUS: Record<ChecklistError["code"], number> = {
  invalid_input: 400,
  not_found: 404,
  conflict: 409,
  needs_override: 422,
  forbidden: 403,
}

export function roomStaysError(error: unknown, label: string) {
  if (error instanceof ChecklistError) {
    return NextResponse.json(
      { success: false, errorCode: error.code, message: error.message, details: error.details ?? null },
      { status: STATUS[error.code] }
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, errorCode: "invalid_input", message: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    )
  }
  console.error(`management room-stays ${label}`, error)
  return NextResponse.json(
    { success: false, errorCode: "unavailable", message: "Something went wrong. Please try again." },
    { status: 500 }
  )
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null)
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}
