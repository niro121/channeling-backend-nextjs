import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export type ManageRosterAuditUser = {
  name: string;
  role?: string;
};

export type ManageRosterDepartmentOption = {
  id: string;
  name: string;
};

export type ManageRosterUiRecord = {
  id: string;
  code: string;
  name: string;
  /** Department master ObjectId */
  departmentId: string;
  /** Resolved from Department relation */
  departmentName: string;
  shiftsPerPersonPerDay: number;
  assignedStaffCount: number;
  activeShiftCount: number;
  /**
   * Derived: referenced by StaffShiftAssignment and/or Staff.employment.roster.
   * When true, update/delete are blocked.
   */
  inUse: boolean;
  shiftAssignmentRefCount: number;
  staffMembershipCount: number;
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
  departmentId: string;
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
  departmentName: string;
  shiftsPerPersonPerDay: number;
  assignedStaffCount: number;
  activeShiftCount: number;
  inUse: boolean;
  shiftAssignmentRefCount: number;
  staffMembershipCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

/** Standing assignment row shown in Manage Rosters inspect dialogs. */
export type ManageRosterInspectAssignment = {
  id: string;
  code: string;
  shiftTypeId: string;
  shiftTypeCode: string;
  shiftTypeName: string;
  status: string;
  rotationPattern: string;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type ManageRosterInspectStaffMember = {
  id: string;
  code: string;
  name: string;
  assignments: ManageRosterInspectAssignment[];
};

export type ManageRosterInspectActiveShift = {
  shiftTypeId: string;
  shiftTypeCode: string;
  shiftTypeName: string;
  activeAssignmentCount: number;
  staffCount: number;
  assignments: ManageRosterInspectAssignment[];
};

export type ManageRosterInspectData = {
  rosterId: string;
  rosterCode: string;
  rosterName: string;
  staff: ManageRosterInspectStaffMember[];
  activeShifts: ManageRosterInspectActiveShift[];
};
