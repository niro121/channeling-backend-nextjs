import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** Placeholder departments until a Department master exists. */
export const MANAGE_ROSTER_DEPARTMENTS = [
  'accounts',
  'administration',
  'channel',
  'laboratory',
  'nursing',
  'pharmacy',
  'reception',
  'other'
] as const;
export type ManageRosterDepartmentId =
  (typeof MANAGE_ROSTER_DEPARTMENTS)[number];

export const MANAGE_ROSTER_DEPARTMENT_LABELS: Record<
  ManageRosterDepartmentId,
  string
> = {
  accounts: 'Accounts',
  administration: 'Administration',
  channel: 'Channel',
  laboratory: 'Laboratory',
  nursing: 'Nursing',
  pharmacy: 'Pharmacy',
  reception: 'Reception',
  other: 'Other'
};

export type ManageRosterAuditUser = {
  name: string;
  role?: string;
};

export type ManageRosterDepartmentOption = {
  id: ManageRosterDepartmentId | string;
  name: string;
};

export type ManageRosterUiRecord = {
  id: string;
  code: string;
  name: string;
  departmentId: ManageRosterDepartmentId | string;
  shiftsPerPersonPerDay: number;
  assignedStaffCount: number;
  activeShiftCount: number;
  createdAt: string;
  updatedAt: string;
  createdByUser: ManageRosterAuditUser;
  updatedByUser: ManageRosterAuditUser;
};

export type ManageRosterFormValues = {
  name: string;
  code: string;
  departmentId: string;
  shiftsPerPersonPerDay: string;
};

export type ManageRosterPayload = {
  name: string;
  code: string;
  departmentId: ManageRosterDepartmentId | string;
  shiftsPerPersonPerDay: number;
};

export type GetManageRosterParams = {
  search?: string;
};

export type ManageRosterServiceRecord = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  shiftsPerPersonPerDay: number;
  assignedStaffCount: number;
  activeShiftCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};
