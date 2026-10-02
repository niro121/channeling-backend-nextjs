"use client"

import { useSession } from "next-auth/react"
import { canAccessRoute, hasPermission, canPerformAction } from "@/lib/permissions"
import { Permissions } from "@/types/user-group"
import { userTypes } from "@/lib/roles"

export function usePermissions() {
  const { data: session } = useSession()
  const permissions = session?.user?.permissions
  const userType = session?.user?.userType

  // Check if user can access a route
  const canAccess = (route: string): boolean => {
    // Admin has access to everything
    if (userType === userTypes.admin) {
      return true
    }

    if (permissions) {
      return canAccessRoute(permissions, route)
    }

    return false
  }

  // Check if user has a specific permission (standard view/add/edit/delete or resource-specific e.g. float-request)
  const has = (resource: string, action: string): boolean => {
    if (userType === userTypes.admin) {
      return true
    }
    if (permissions) {
      return hasPermission(permissions, resource, action)
    }
    return false
  }

  // Check if user can perform an action
  const canPerform = (resource: string, action: string): boolean => {
    return has(resource, action)
  }

  return {
    permissions: permissions || null,
    canAccess,
    has,
    canPerform,
    isAdmin: userType === userTypes.admin,
  }
}
