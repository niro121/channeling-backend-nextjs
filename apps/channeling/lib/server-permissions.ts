"use server"

import { fetchServerSession } from "./session"
import { canAccessRoute, hasPermission, canPerformAction } from "./permissions"
import { userTypes } from "./roles"

/**
 * Server-side permission checking utilities
 */

/**
 * Check if the current user can access a route
 */
export async function checkRouteAccess(route: string): Promise<boolean> {
  const session = await fetchServerSession()
  const userType = session?.user?.userType
  const permissions = session?.user?.permissions

  // Admin has access to everything
  if (userType === userTypes.admin) {
    return true
  }

  if (permissions) {
    return canAccessRoute(permissions, route)
  }

  return false
}

/**
 * Check if the current user has a specific permission.
 * Action is standard (view/add/edit/delete) or resource-specific (e.g. float-approve).
 */
export async function checkPermission(
  resource: string,
  action: string
): Promise<boolean> {
  const session = await fetchServerSession()
  const userType = session?.user?.userType
  const permissions = session?.user?.permissions

  // Admin has all permissions
  if (userType === userTypes.admin) {
    return true
  }

  if (permissions) {
    return hasPermission(permissions, resource, action)
  }

  return false
}

/**
 * Check if the current user can perform an action on a resource
 */
export async function checkCanPerform(
  resource: string,
  action: string
): Promise<boolean> {
  return checkPermission(resource, action)
}

/**
 * Get current user's permissions
 */
export async function getCurrentUserPermissions() {
  const session = await fetchServerSession()
  return session?.user?.permissions || null
}

/**
 * Require permission - throws error if user doesn't have permission
 */
export async function requirePermission(
  resource: string,
  action: string
): Promise<void> {
  const hasAccess = await checkPermission(resource, action)
  if (!hasAccess) {
    throw new Error(`Access denied: You don't have permission to ${action} ${resource}`)
  }
}
