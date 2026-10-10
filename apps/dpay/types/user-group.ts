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
  { id: 'doctor-payments', name: 'Doctor Payments' },
  { id: 'payments', name: 'Payments' },
  { id: 'receipts', name: 'Receipts' },
  { id: 'bank-accounts', name: 'Bank Accounts' },
  { id: 'ledger', name: 'Ledger' },
  { id: 'reconciliation', name: 'Reconciliation' },
  { id: 'settlements', name: 'Settlements' },
  { id: 'reports', name: 'Reports' },
  { id: 'users', name: 'Users & User Groups' },
];
