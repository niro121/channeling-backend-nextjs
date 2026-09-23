"use server"

import { fetchServerSession } from "./session"
import { canAccessRoute, hasPermission, canPerformAction } from "./permissions"
import { userTypes } from "./roles"
import prisma from "@/lib/prisma"
import type { Permissions } from "@/types/user-group"
import {
  CANCELABLE_LEDGER_METHODS,
  allowedLedgerTransactionTypes,
  canAddLedgerTransactionType,
  canCancelLedgerReceiptMethod,
} from "./ledger-type-permissions"
import {
  LEDGER_TRANSACTION_TYPES,
  type LedgerTransactionType,
} from "@/services/ledger/create-ledger-receipt.service"

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

/** Transaction types the signed-in user may record. Admins may record every type. */
export async function getAllowedLedgerTransactionTypes(): Promise<LedgerTransactionType[]> {
  const { isAdmin, permissions } = await getLedgerPermissionContext()
  if (isAdmin) return [...LEDGER_TRANSACTION_TYPES]
  return allowedLedgerTransactionTypes(permissions)
}

export async function assertCanAddLedgerTransactionType(
  type: LedgerTransactionType
): Promise<boolean> {
  const { isAdmin, permissions } = await getLedgerPermissionContext()
  if (isAdmin) return true
  return canAddLedgerTransactionType(permissions, type)
}

/** Receipt methods this user may cancel. Bank deposit uses its own cancel permission. */
export async function getCancelableLedgerMethods(): Promise<number[]> {
  const { isAdmin, permissions } = await getLedgerPermissionContext()
  if (isAdmin) return [...CANCELABLE_LEDGER_METHODS]
  return CANCELABLE_LEDGER_METHODS.filter((method) =>
    canCancelLedgerReceiptMethod(permissions, method)
  )
}

export async function assertCanCancelLedgerReceiptMethod(method: number): Promise<boolean> {
  const { isAdmin, permissions } = await getLedgerPermissionContext()
  if (isAdmin) return (CANCELABLE_LEDGER_METHODS as readonly number[]).includes(method)
  return canCancelLedgerReceiptMethod(permissions, method)
}

/**
 * Read the user group's permissions from the database so a type that was just
 * turned off is hidden and rejected without waiting for a new login.
 */
async function getLedgerPermissionContext(): Promise<{
  isAdmin: boolean
  permissions: Permissions | null | undefined
}> {
  const session = await fetchServerSession()
  if (!session?.user?.id) return { isAdmin: false, permissions: null }
  if (session.user.userType === userTypes.admin) {
    return { isAdmin: true, permissions: session.user.permissions }
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { userGroup: { select: { permissions: true } } },
    })
    const permissions = (user?.userGroup?.permissions ?? null) as Permissions | null
    return { isAdmin: false, permissions: permissions ?? session.user.permissions }
  } catch (err) {
    console.error("getLedgerPermissionContext failed", err)
    return { isAdmin: false, permissions: session.user.permissions }
  }
}
