import type { Permissions } from "@/types/user-group"

/**
 * Privileges that used to follow a parent resource.
 * An unset flag still follows the parent. An explicit false does not.
 */
export const INHERITED_PRIVILEGES: Record<
  string,
  { from: string; actions: readonly string[] }
> = {
  "channel-room-dashboard": { from: "channel-booking", actions: ["view"] },
  "bulk-price-change": { from: "doctor-sessions", actions: ["view", "edit", "delete"] },
  "user-groups": { from: "users", actions: ["view", "add", "edit", "delete"] },
  "receipt-templates": { from: "ledger", actions: ["view", "edit"] },
}

export function inheritedPrivilegeAllows(
  permissions: Permissions | null | undefined,
  resource: string,
  action: string
): boolean {
  const rule = INHERITED_PRIVILEGES[resource]
  if (!rule || !rule.actions.includes(action)) return false
  return permissions?.[rule.from]?.[action] === true
}

/** Copy a parent grant onto a new privilege that was never saved, so the editor matches current access. */
export function materializeInheritedPrivileges(permissions: Permissions): Permissions {
  let next = permissions
  for (const [resource, rule] of Object.entries(INHERITED_PRIVILEGES)) {
    const parent = next[rule.from]
    if (!parent) continue
    const current = { ...(next[resource] ?? {}) }
    let changed = false
    for (const action of rule.actions) {
      if (current[action] !== undefined) continue
      if (parent[action] === true) {
        current[action] = true
        changed = true
      }
    }
    if (changed) next = { ...next, [resource]: current }
  }
  return next
}
