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
  { id: 'employees', name: 'Employees' },
  { id: 'departments', name: 'Departments' },
  { id: 'positions', name: 'Positions' },
  { id: 'leave-requests', name: 'Leave Requests' },
  { id: 'leave-types', name: 'Leave Types' },
  { id: 'leave-entitlement', name: 'Leave Entitlement' },
  { id: 'attendance', name: 'Attendance' },
  { id: 'payroll', name: 'Payroll' },
  { id: 'salary-structures', name: 'Salary Structures' },
  { id: 'reports', name: 'Reports' },
  { id: 'users', name: 'Users & User Groups' },
];
