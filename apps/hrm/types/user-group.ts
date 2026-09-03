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
  { id: 'staff', name: 'Staff' },
  { id: 'leave-types', name: 'Leave Types' },
  { id: 'leave-entitlement', name: 'Leave Entitlement' },
  { id: 'leave-management', name: 'Leave Management' },
  { id: 'leave-application', name: 'Leave Application' },
  { id: 'overtime-requests', name: 'OT Requests' },
  { id: 'shift-roster', name: 'Roster & Shifts' },
  { id: 'users', name: 'Users & User Groups' },
];
