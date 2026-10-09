"use server"

import { fetchServerSession } from "./session";
import { canAccessRoute, hasPermission, canPerformAction } from "./permissions";
import { userTypes } from "./roles";

export async function checkRouteAccess(route: string): Promise<boolean> {
  const session = await fetchServerSession();
  const userType = session?.user?.userType;
  const permissions = session?.user?.permissions;
  if (userType === userTypes.admin) return true;
  if (permissions) return canAccessRoute(permissions, route);
  return false;
}

export async function checkPermission(resource: string, action: string): Promise<boolean> {
  const session = await fetchServerSession();
  const userType = session?.user?.userType;
  const permissions = session?.user?.permissions;
  if (userType === userTypes.admin) return true;
  if (permissions) return hasPermission(permissions, resource, action);
  return false;
}

export async function checkCanPerform(resource: string, action: string): Promise<boolean> {
  return checkPermission(resource, action);
}

export async function getCurrentUserPermissions() {
  const session = await fetchServerSession();
  return session?.user?.permissions || null;
}

export async function requirePermission(resource: string, action: string): Promise<void> {
  const hasAccess = await checkPermission(resource, action);
  if (!hasAccess) {
    throw new Error(`Access denied: You don't have permission to ${action} ${resource}`);
  }
}
