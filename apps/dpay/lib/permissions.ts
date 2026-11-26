import type { Permissions } from '@archmage/shared';
import { canAccessReportPath } from '@/lib/report-privileges';

/**
 * Route → user-group resource. Unmapped routes (welcome, account) stay open
 * to anyone who signed in.
 */
export const ROUTE_TO_RESOURCE: Record<string, string> = {
  '/patient-bills': 'patient-bills',
  '/doctor-payments': 'doctor-payments',
  '/receipts': 'receipts',
  '/receipt-manager': 'receipt-manager',
  '/reports': 'reports',
  '/user-groups': 'users',
  '/users': 'users',
};

export function hasPermission(
  permissions: Permissions | null | undefined,
  resource: string,
  action: string
): boolean {
  if (!permissions) return false;
  return permissions[resource]?.[action] === true;
}

export function getResourceFromRoute(route: string): string | null {
  if (ROUTE_TO_RESOURCE[route]) return ROUTE_TO_RESOURCE[route];
  let match: string | null = null;
  let matchLength = -1;
  for (const [mappedRoute, resource] of Object.entries(ROUTE_TO_RESOURCE)) {
    if ((route === mappedRoute || route.startsWith(`${mappedRoute}/`)) && mappedRoute.length > matchLength) {
      match = resource;
      matchLength = mappedRoute.length;
    }
  }
  return match;
}

export function canAccessRoute(
  permissions: Permissions | null | undefined,
  route: string
): boolean {
  const path = route.split('?')[0].replace(/\/$/, '') || '/';
  if (path === '/reports' || path.startsWith('/reports/')) {
    return canAccessReportPath(permissions, path);
  }
  const resource = getResourceFromRoute(route);
  if (!resource) return true;
  return hasPermission(permissions, resource, 'view');
}
