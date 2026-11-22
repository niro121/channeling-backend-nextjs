import "server-only"
import { hasPermission } from "@/lib/permissions"
import { roomStaysCan } from "@/lib/room-checklist-access"
import type { ManagementActor } from "@/lib/management-app-auth"

/**
 * What Ayu (in the management app) may look up for the signed-in person. Ayu never sees more than
 * the person asking: every tool needs that person's own privilege for the data AND the matching
 * "Ayu can look up" switch under Management App – Ayu. Admins have everything.
 */
export type AyuTool = "room-stays" | "contacts"

type Need = { label: string; ok: (a: ManagementActor) => boolean }

const AI = "management-ai"
const chat: Need = { label: "Management App – Ayu → Chat with Ayu", ok: (a) => hasPermission(a.permissions, AI, "chat") }
const viewStays: Need = {
  label: "Room Check-in / Check-out → View rooms, stays and checklists",
  ok: (a) => roomStaysCan(a.permissions, false).view,
}
const ayuStays: Need = {
  label: "Management App – Ayu → Ayu can look up: room stays, checklists and room statistics",
  ok: (a) => hasPermission(a.permissions, AI, "tool-room-stays"),
}
const ayuContacts: Need = {
  label: "Management App – Ayu → Ayu can look up: patient contacts (phone numbers)",
  ok: (a) => hasPermission(a.permissions, AI, "tool-contacts"),
}

const NEEDS: Record<AyuTool, Need[]> = {
  "room-stays": [chat, viewStays, ayuStays],
  contacts: [chat, viewStays, ayuStays, ayuContacts],
}

/** Privileges the person is missing for this tool (empty = allowed). */
export function missingAyuPrivileges(actor: ManagementActor, tool: AyuTool): string[] {
  if (actor.isAdmin) return []
  return NEEDS[tool].filter((n) => !n.ok(actor)).map((n) => n.label)
}

/** What Ayu may use for this person, for /api/management/me. */
export function ayuToolsFor(actor: ManagementActor) {
  return {
    roomStays: missingAyuPrivileges(actor, "room-stays").length === 0,
    contacts: missingAyuPrivileges(actor, "contacts").length === 0,
  }
}
