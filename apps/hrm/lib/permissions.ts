import { Permissions } from '@archmage/shared';

export const ROUTE_TO_RESOURCE: Record<string, string> = {
  '/staff': 'staff',
  '/employees': 'employees',
  '/departments': 'departments',
  '/positions': 'positions',
  '/leave-requests': 'leave-requests',
  '/leave-types': 'leave-types',
  '/leave-entitlement': 'leave-entitlement',
  '/leave-management': 'leave-management',
  '/leave-application': 'leave-application',
  '/overtime-requests': 'overtime-requests',
  '/overtime-extra-time': 'overtime-requests',
  '/overtime-day-off-ph-shift': 'overtime-requests',
  '/attendance': 'attendance',
  '/payroll': 'payroll',
  '/salary-structures': 'salary-structures',
  '/reports': 'reports',
  '/users': 'users',
  '/user-groups': 'users',
  '/admin/api-clients': 'api-clients',
};

export const ROUTE_REQUIRED_ACTION: Partial<Record<string, string>> = {};

export const METHOD_TO_ACTION: Record<string, 'view' | 'add' | 'edit' | 'delete'> = {
  GET: 'view',
  POST: 'add',
  PUT: 'edit',
  PATCH: 'edit',
  DELETE: 'delete',
};

export function hasPermission(
  permissions: Permissions | null | undefined,
  resource: string,
  action: string
): boolean {
  if (!permissions) return false;
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;
  return resourcePermissions[action] === true;
}

export function canAccessRoute(
  permissions: Permissions | null | undefined,
  route: string
): boolean {
  const resource = ROUTE_TO_RESOURCE[route];
  if (!resource) return true;
  const action = ROUTE_REQUIRED_ACTION[route] ?? 'view';
  return hasPermission(permissions, resource, action);
}

export function getResourceFromRoute(route: string): string | null {
  if (ROUTE_TO_RESOURCE[route]) return ROUTE_TO_RESOURCE[route];
  for (const [mappedRoute, resource] of Object.entries(ROUTE_TO_RESOURCE)) {
    if (route.startsWith(mappedRoute)) return resource;
  }
  return null;
}

export function canPerformAction(
  permissions: Permissions | null | undefined,
  resource: string,
  action: string
): boolean {
  return hasPermission(permissions, resource, action);
}
