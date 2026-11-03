"use client"

import { useSession } from "next-auth/react"
import { canAccessRoute, hasPermission } from "@/lib/permissions"
import { userTypes } from "@/lib/roles"

export function usePermissions() {
  const { data: session } = useSession()
  const permissions = session?.user?.permissions
  const userType = session?.user?.userType

  const canAccess = (route: string): boolean => {
    if (userType === userTypes.admin) {
      return true
    }

    if (permissions) {
      return canAccessRoute(permissions, route)
    }

    return false
  }

  const has = (resource: string, action: string): boolean => {
    if (userType === userTypes.admin) {
      return true
    }
    if (permissions) {
      return hasPermission(permissions, resource, action)
    }
    return false
  }

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
