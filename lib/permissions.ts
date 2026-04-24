import { Permissions } from "@/types/user-group"

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
  "/handovers": "handover",
  "/doctor-payments": "doctor-payments",
  "/receipt-manager": "receipt-manager",
  "/reconciliation": "reconciliation",
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

/**
 * Check if user can access a route
 * Uses ROUTE_REQUIRED_ACTION when set (e.g. /bulk-cashier requires "edit"), otherwise "view"
 */
export function canAccessRoute(
  permissions: Permissions | null | undefined,
  route: string
): boolean {
  // Find the resource for this route
  const resource = ROUTE_TO_RESOURCE[route]
  if (!resource) {
    // If route is not mapped, allow access (for routes like /welcome, /profile, etc.)
    return true
  }

  const action = ROUTE_REQUIRED_ACTION[route] ?? "view"
  return hasPermission(permissions, resource, action)
}

/**
 * Get the resource from a route path
 */
export function getResourceFromRoute(route: string): string | null {
  // Check exact matches first
  if (ROUTE_TO_RESOURCE[route]) {
    return ROUTE_TO_RESOURCE[route]
  }

  // Check if route starts with any mapped route
  for (const [mappedRoute, resource] of Object.entries(ROUTE_TO_RESOURCE)) {
    if (route.startsWith(mappedRoute)) {
      return resource
    }
  }

  return null
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
