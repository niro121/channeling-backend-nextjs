export type {
  PermissionAction,
  ResourcePermissions,
  Permissions,
  UserGroup,
  ResourceWithOptionalActions,
} from '@archmage/shared';

export { PERMISSION_ACTIONS } from '@archmage/shared';

import type { PermissionAction, ResourceWithOptionalActions } from '@archmage/shared';

export type DpayPermissionResource = ResourceWithOptionalActions & {
  group: string;
  actions: readonly PermissionAction[];
};

export type PermissionResourceGroup = {
  name: string;
  resources: DpayPermissionResource[];
};

/** Same order as the DPAY sidebar. */
export const RESOURCES: DpayPermissionResource[] = [
  { id: 'patient-bills', name: 'Patient Bills', group: 'Finance', actions: ['view', 'add', 'edit'] },
  { id: 'doctor-payments', name: 'Doctor Payments', group: 'Finance', actions: ['view', 'add'] },
  { id: 'receipts', name: 'Receipts', group: 'Finance', actions: ['view'] },
  { id: 'receipt-manager', name: 'Receipt Manager', group: 'Finance', actions: ['view'] },
  { id: 'reports', name: 'Reports', group: 'Reports', actions: ['view'] },
  {
    id: 'users',
    name: 'Users & User Groups',
    group: 'Administration',
    actions: ['view', 'add', 'edit', 'delete'],
  },
];

export function groupPermissionResources(
  resources: DpayPermissionResource[] = RESOURCES
): PermissionResourceGroup[] {
  const groups: PermissionResourceGroup[] = [];
  for (const resource of resources) {
    const last = groups[groups.length - 1];
    if (last && last.name === resource.group) last.resources.push(resource);
    else groups.push({ name: resource.group, resources: [resource] });
  }
  return groups;
}
