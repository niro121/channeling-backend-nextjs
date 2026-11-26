'use server';

import type { Permissions } from '@archmage/shared';
import { fetchServerSession } from '@/lib/session';
import { userTypes } from '@/lib/roles';
import { canAccessRoute, hasPermission } from '@/lib/permissions';
import { canViewReport } from '@/lib/report-privileges';

export async function checkPermission(resource: string, action: string): Promise<boolean> {
  const session = await fetchServerSession();
  if (session?.user?.userType === userTypes.admin) return true;
  return hasPermission(session?.user?.permissions, resource, action);
}

export async function checkRouteAccess(route: string): Promise<boolean> {
  const session = await fetchServerSession();
  if (session?.user?.userType === userTypes.admin) return true;
  return canAccessRoute(session?.user?.permissions, route);
}

export async function requireReport(action: string): Promise<void> {
  const session = await fetchServerSession();
  if (session?.user?.userType === userTypes.admin) return;
  if (!canViewReport(session?.user?.permissions, action)) {
    throw new Error("Access denied: You don't have permission to view this report");
  }
}

export async function requirePermission(resource: string, action: string): Promise<void> {
  const allowed = await checkPermission(resource, action);
  if (!allowed) {
    throw new Error(`Access denied: You don't have permission to ${action} ${resource}`);
  }
}

/** Passes when any one of the checks is allowed. Admins pass. */
export async function requireAnyPermission(
  checks: { resource: string; action: string }[]
): Promise<void> {
  for (const check of checks) {
    if (await checkPermission(check.resource, check.action)) return;
  }
  throw new Error("Access denied: You don't have permission for this action");
}

export async function getCurrentUserPermissions(): Promise<Permissions | null> {
  const session = await fetchServerSession();
  return session?.user?.permissions ?? null;
}
