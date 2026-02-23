import { Permissions } from "@/types/user-group"

// Map routes to resources
export const ROUTE_TO_RESOURCE: Record<string, string> = {
  "/users": "users",
  "/user-groups": "users", // User groups are part of users management
  "/channel-booking": "channel-booking",
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
  "/discounts": "discounts",
  "/doctor-leaves": "doctor-leaves",
  "/sms-playground": "sms-playground",
  "/sms-templates": "sms-templates",
  "/reports": "reports",
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
 * Check if user has permission for a specific resource and action
 */
export function hasPermission(
  permissions: Permissions | null | undefined,
  resource: string,
  action: "view" | "add" | "edit" | "delete"
): boolean {
  // If no permissions, deny access
  if (!permissions) {
    return false
  }

  // Check if resource exists in permissions
  const resourcePermissions = permissions[resource]
  if (!resourcePermissions) {
    return false
  }

  // Return the specific permission
  return resourcePermissions[action] === true
}

/**
 * Check if user can access a route
 * This checks if user has "view" permission for the resource mapped to the route
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

  // Check view permission
  return hasPermission(permissions, resource, "view")
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
 * Check if user can perform an action on a resource
 * Used for API routes and server actions
 */
export function canPerformAction(
  permissions: Permissions | null | undefined,
  resource: string,
  action: "view" | "add" | "edit" | "delete"
): boolean {
  return hasPermission(permissions, resource, action)
}
