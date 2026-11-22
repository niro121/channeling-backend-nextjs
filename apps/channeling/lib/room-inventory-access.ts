import { hasPermission } from "@/lib/permissions"
import type { Permissions } from "@/types/user-group"

/**
 * Room inventory privileges, shared by the web actions, the management API and /me.
 * - view: see rooms and what is in them (room-inventory.view, same as the /room-inventory route gate)
 * - assign: add from store, move, return to store (room-inventory.assign)
 * - condition: mark available / under repair / broken (room-inventory.assign or inventory.edit)
 */
export function roomInventoryCan(permissions: Permissions | null | undefined, isAdmin: boolean) {
  if (isAdmin) return { view: true, assign: true, condition: true }
  const assign = hasPermission(permissions, "room-inventory", "assign")
  return {
    view: hasPermission(permissions, "room-inventory", "view"),
    assign,
    condition: assign || hasPermission(permissions, "inventory", "edit"),
  }
}
