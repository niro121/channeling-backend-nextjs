import { Permissions } from '@archmage/shared';

/* -----------------------------------------------------------------------------
 * Public API machine scopes (API Clients / Bearer tokens)
 * Separate from dashboard User Group resources (view/add/edit/delete).
 * Add new product scopes here as public APIs are released.
 * -------------------------------------------------------------------------- */
export const PUBLIC_API_SCOPES = [
  {
    id: 'careers:read',
    label: 'Careers — Read jobs',
    group: 'Careers'
  },
  {
    id: 'careers:apply',
    label: 'Careers — Submit applications',
    group: 'Careers'
  }
] as const;

export type PublicApiScopeId = (typeof PUBLIC_API_SCOPES)[number]['id'];

/** Scope ids only — for Zod / persistence validation. */
export const PUBLIC_API_SCOPE_IDS = PUBLIC_API_SCOPES.map(
  (s) => s.id
) as unknown as [PublicApiScopeId, ...PublicApiScopeId[]];

/** Default scopes for a new API client (read-only Careers). */
export const DEFAULT_PUBLIC_API_SCOPES: PublicApiScopeId[] = ['careers:read'];

/** Options for CustomMultiSelect / forms. */
export const PUBLIC_API_SCOPE_OPTIONS = PUBLIC_API_SCOPES.map((s) => ({
  id: s.id,
  name: s.label
}));

export function getPublicApiScopeLabel(scopeId: string): string {
  return PUBLIC_API_SCOPES.find((s) => s.id === scopeId)?.label ?? scopeId;
}

export function isPublicApiScopeId(value: string): value is PublicApiScopeId {
  return (PUBLIC_API_SCOPE_IDS as readonly string[]).includes(value);
}

export const ROUTE_TO_RESOURCE: Record<string, string> = {
  '/user-groups': 'users',
  '/users': 'users',
  '/api-clients': 'users',
  '/staff': 'staff',
  // HR-Admin
  '/paysheet-components': 'paysheet-components',
  '/hrm-variables': 'hrm-variables',
  '/salary-cycles': 'salary-cycles',
  '/holiday-calendar': 'holiday-calendar',
  '/designations': 'designations',
  '/staff-grades': 'staff-grades',
  '/staff-specialities': 'staff-specialities',
  '/manage-rosters': 'manage-rosters',
  // Roster & Shifts
  '/shift-roster': 'shift-roster',
  '/shift-types': 'shift-roster',
  '/shift-assignment': 'shift-roster',
  '/duty-roster': 'shift-roster',
  '/roster-amendments': 'shift-roster',
  '/night-shifts': 'shift-roster',
  '/overnight-shifts': 'shift-roster',
  '/public-holiday-shifts': 'shift-roster',
  // Staff Attendance
  '/attendance': 'attendance',
  '/rfid-attendance': 'attendance',
  '/attendance-daily': 'attendance',
  '/attendance-devices': 'attendance',
  '/attendance-corrections': 'attendance',
  '/fingerprint-verification': 'attendance',
  '/attendance-summary': 'attendance',
  '/attendance-logs': 'attendance',
  // Payroll
  '/payroll': 'payroll',
  '/salary-generation': 'payroll',
  '/salary-processing': 'payroll',
  '/assign-paysheet-component': 'payroll',
  '/bulk-assign-paysheet-component': 'payroll',
  '/performance-allowance': 'payroll',
  '/loans-advances': 'payroll',
  '/salary-structures': 'payroll',
  '/allowances': 'payroll',
  '/deductions': 'payroll',
  '/payslips': 'payroll',
  '/bank-transfer-file': 'payroll',
  '/salary-history': 'payroll',
  // Recruitment
  '/vacancy-requests': 'recruitment',
  '/job-posts': 'recruitment',
  '/applications': 'recruitment',
  '/resume-bank': 'recruitment',
  '/shortlisting': 'recruitment',
  '/interview-schedule': 'recruitment',
  '/evaluation': 'recruitment',
  '/appointment-letters': 'recruitment',
  '/leave-types': 'leave-types',
  '/leave-entitlement': 'leave-entitlement',
  '/leave-management': 'leave-management',
  '/leave-application': 'leave-application',
  '/overtime-requests': 'overtime-requests',
  '/overtime-extra-time': 'overtime-requests',
  '/overtime-day-off-ph-shift': 'overtime-requests',
  '/overtime-extra-shift-normal': 'overtime-requests',
  // Ruhunu Organization
  '/departments': 'organizations',
  '/locations': 'organizations',
  '/zones': 'organizations',
  '/rooms': 'organizations',
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
