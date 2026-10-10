import { Permissions } from "@/types/user-group"
import { canAddLedgerTransactionType } from "@/lib/ledger-type-permissions"
import { canAccessReportPath } from "@/lib/report-privileges"

// Map routes to resources
export const ROUTE_TO_RESOURCE: Record<string, string> = {
  "/users": "users",
  "/user-groups": "users", // User groups are part of users management
  "/channel-booking": "channel-booking",
  "/channel-room-dashboard": "channel-booking",
  "/sessions": "sessions",
  "/doctors": "doctors",
  "/doctor-sessions": "doctor-sessions",
  "/departments": "departments",
  "/patients": "patients",
  "/staff": "staff",
  "/tags": "tags",
  "/zones": "zones",
  "/rooms": "rooms",
  "/specialities": "specialities",
  "/locations": "locations",
  "/agency-books": "agency-books",
  "/agencies": "agencies",
  "/agencies/allowed-credit-limits": "agencies",
  "/credit-customers": "credit-customers",
  "/discounts": "discounts",
  "/doctor-leaves": "doctor-leaves",
  "/sms-playground": "sms-playground",
  "/sms-templates": "sms-templates",
  "/reports": "reports",
  "/admin/api-clients": "api-clients",
  "/admin/receipt-templates": "ledger",
  "/accounting": "accounting",
  "/ledger": "ledger",
  "/bank-accounts": "bank-accounts",
  "/my-till": "bulk-cashier",
  "/bulk-cashier": "bulk-cashier",
  "/float-transfers": "float-transfers",
  "/shifts": "shifts",
  "/shift-bills": "shift",
  "/handovers": "handover",
  "/doctor-payments": "doctor-payments",
  "/receipt-manager": "receipt-manager",
  "/reconciliation": "reconciliation",
  "/approvals": "approvals",
}

/** When set, route access requires this action instead of "view" (e.g. bulk-cashier uses "bulk-cashier-dashboard") */
export const ROUTE_REQUIRED_ACTION: Partial<Record<string, string>> = {
  "/bulk-cashier": "bulk-cashier-dashboard",
  "/my-till": "my-till",
  "/agencies/allowed-credit-limits": "edit-allowed-credit-limit",
}

// Map HTTP methods to permission actions
export const METHOD_TO_ACTION: Record<string, "view" | "add" | "edit" | "delete"> = {
  GET: "view",
  POST: "add",
  PUT: "edit",
  PATCH: "edit",
  DELETE: "delete",
}

/**
 * Check if user has permission for a specific resource and action.
 * Action is standard (view/add/edit/delete) or resource-specific (e.g. bulk-cashier: float-view, float-approve).
 */
export function hasPermission(
  permissions: Permissions | null | undefined,
  resource: string,
  action: string
): boolean {
  if (!permissions) return false
  const resourcePermissions = permissions[resource]
  if (!resourcePermissions) return false
  return resourcePermissions[action] === true
}

function normalizeRoute(route: string): string {
  const path = route.split("?")[0].replace(/\/$/, "")
  return path || "/"
}

/**
 * Longest mapped path for this URL.
 * `/agencies/allowed-credit-limits` stays on its own rule, not the `/agencies` view rule.
 * Child pages such as `/doctors/123/edit` inherit the parent route.
 */
export function resolveMappedRoute(route: string): string | null {
  const path = normalizeRoute(route)
  if (ROUTE_TO_RESOURCE[path]) return path

  let best: string | null = null
  for (const mappedRoute of Object.keys(ROUTE_TO_RESOURCE)) {
    if (!path.startsWith(`${mappedRoute}/`)) continue
    if (!best || mappedRoute.length > best.length) best = mappedRoute
  }
  return best
}

/**
 * Check if user can access a route.
 * Uses ROUTE_REQUIRED_ACTION when set (e.g. /bulk-cashier requires "bulk-cashier-dashboard"), otherwise "view".
 * Unmapped routes (welcome, profile) stay open. Mapped routes, including child pages, require the mapped permission.
 */
export function canAccessRoute(
  permissions: Permissions | null | undefined,
  route: string
): boolean {
  const path = normalizeRoute(route)
  if (path === "/reports" || path.startsWith("/reports/")) {
    return canAccessReportPath(permissions, path)
  }

  const mappedRoute = resolveMappedRoute(path)
  if (!mappedRoute) {
    return true
  }

  const resource = ROUTE_TO_RESOURCE[mappedRoute]
  const action = ROUTE_REQUIRED_ACTION[mappedRoute] ?? "view"
  if (mappedRoute === "/approvals") {
    return (
      hasPermission(permissions, resource, "view") ||
      hasPermission(permissions, resource, "approve-channel-cancel") ||
      hasPermission(permissions, resource, "approve-channel-refund") ||
      hasPermission(permissions, resource, "approve-bank-deposit") ||
      hasPermission(permissions, "channel-booking", "edit") ||
      canAddLedgerTransactionType(permissions, "BANK_DEPOSIT")
    )
  }
  return hasPermission(permissions, resource, action)
}

/**
 * Get the resource from a route path
 */
export function getResourceFromRoute(route: string): string | null {
  const mappedRoute = resolveMappedRoute(route)
  return mappedRoute ? ROUTE_TO_RESOURCE[mappedRoute] : null
}

/**
 * Check if user can perform an action on a resource.
 * Used for API routes and server actions.
 */
export function canPerformAction(
  permissions: Permissions | null | undefined,
  resource: string,
  action: string
): boolean {
  return hasPermission(permissions, resource, action)
}
