export type {
  PermissionAction,
  ResourcePermissions,
  Permissions,
  TwoFactorMethodId,
  UserGroup,
  GetUserGroupsParams,
  GetUserGroupsQuery,
  GetUserGroupsReturn,
  ResourceWithOptionalActions,
} from '@archmage/shared';

export { PERMISSION_ACTIONS } from '@archmage/shared';

import type { ResourceWithOptionalActions } from '@archmage/shared';

export const RESOURCES: ResourceWithOptionalActions[] = [
  { id: 'users', name: 'Users & User Groups' },
  { id: 'staff', name: 'Staff' },
  // HR-Admin
  { id: 'paysheet-components', name: 'Paysheet Components' },
  { id: 'leave-types', name: 'Leave Types' },
  { id: 'leave-entitlement', name: 'Leave Entitlement' },
  { id: 'leave-management', name: 'Leave Management' },
  { id: 'leave-application', name: 'Leave Application' },
  { id: 'overtime-requests', name: 'OT Requests' },
  { id: 'shift-roster', name: 'Roster & Shifts' },
  { id: 'attendance', name: 'Staff Attendance' },
  { id: 'payroll', name: 'Payroll' },
  { id: 'holiday-calendar', name: 'Holiday Calendar' },
  { id: 'designations', name: 'Designations' },
  { id: 'staff-grades', name: 'Area / Staff Grade' },
  { id: 'staff-specialities', name: 'Staff Specialities' },
  { id: 'manage-rosters', name: 'Manage Rosters' },
  { id: 'organizations', name: 'Organization' },
];
