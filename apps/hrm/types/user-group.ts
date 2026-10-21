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

export type HrmPermissionResource = ResourceWithOptionalActions & {
  /** Sidebar group this module belongs to. */
  group: string;
};

export type PermissionResourceGroup = {
  name: string;
  resources: HrmPermissionResource[];
};

/** Same top-to-bottom order as the HRM sidebar. */
export const RESOURCES: HrmPermissionResource[] = [
  { id: 'attendance', name: 'Staff Attendance', group: 'Staff Attendance' },
  { id: 'leave-types', name: 'Leave Types', group: 'Leave Management' },
  {
    id: 'leave-entitlement',
    name: 'Leave Entitlement',
    group: 'Leave Management'
  },
  {
    id: 'leave-application',
    name: 'Leave Application',
    group: 'Leave Management'
  },
  {
    id: 'leave-management',
    name: 'Leave Management',
    group: 'Leave Management'
  },
  { id: 'shift-roster', name: 'Roster & Shifts', group: 'Roster & Shifts' },
  {
    id: 'overtime-requests',
    name: 'OT Requests',
    group: 'Overtime Management'
  },
  { id: 'payroll', name: 'Payroll', group: 'Payroll' },
  { id: 'recruitment', name: 'Recruitment', group: 'Recruitment' },
  { id: 'users', name: 'Users & User Groups', group: 'Administration' },
  { id: 'staff', name: 'Staff', group: 'Administration' },
  {
    id: 'holiday-calendar',
    name: 'Holiday Calendar',
    group: 'HR Administration'
  },
  { id: 'designations', name: 'Designations', group: 'HR Administration' },
  {
    id: 'staff-grades',
    name: 'Area / Staff Grade',
    group: 'HR Administration'
  },
  {
    id: 'staff-specialities',
    name: 'Staff Specialities',
    group: 'HR Administration'
  },
  { id: 'manage-rosters', name: 'Manage Rosters', group: 'HR Administration' },
  {
    id: 'paysheet-components',
    name: 'Paysheet Components',
    group: 'HR Administration'
  },
  {
    id: 'hrm-variables',
    name: 'HRM Variable (EPF/ETF/PAYE)',
    group: 'HR Administration'
  },
  { id: 'salary-cycles', name: 'Salary Cycle', group: 'HR Administration' },
  { id: 'organizations', name: 'Organization', group: 'Organization' }
];

/** Consecutive modules that share a sidebar group, in sidebar order. */
export function groupPermissionResources(
  resources: HrmPermissionResource[] = RESOURCES
): PermissionResourceGroup[] {
  const groups: PermissionResourceGroup[] = [];

  for (const resource of resources) {
    const last = groups[groups.length - 1];
    if (last && last.name === resource.group) {
      last.resources.push(resource);
    } else {
      groups.push({ name: resource.group, resources: [resource] });
    }
  }

  return groups;
}
