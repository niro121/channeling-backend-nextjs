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

/** Manage Rosters workspace tab: group catalog vs membership register. */
export type ManageRosterWorkspaceTab = 'rosters' | 'staff';

export const MANAGE_ROSTER_WORKSPACE_TAB_LABELS: Record<
  ManageRosterWorkspaceTab,
  string
> = {
  rosters: 'Rosters',
  staff: 'Assigned Staff'
};

/** Filters for the Assigned Staff tab (membership register). */
export type StaffRosterFilterValues = {
  /** Manage Roster ObjectId — required to load members. */
  rosterId: string;
  /** Selected Staff ObjectId from Combobox (empty = any). URL key: staffId */
  staffId: string;
  departmentId: string;
  /** Staff status label, or empty / `__all__` for any. */
  status: string;
};

export const EMPTY_STAFF_ROSTER_FILTERS: StaffRosterFilterValues = {
  rosterId: '',
  staffId: '',
  departmentId: '',
  status: ''
};

export function staffRosterFiltersFromSearchParams(params: {
  rosterId?: string;
  staffId?: string;
  departmentId?: string;
  status?: string;
  id?: string;
}): StaffRosterFilterValues {
  const status = params.status?.trim() ?? '';
  return {
    rosterId: params.rosterId?.trim() || params.id?.trim() || '',
    staffId: params.staffId?.trim() || '',
    departmentId: params.departmentId?.trim() || '',
    status: !status || status === '__all__' ? '' : status
  };
}

/**
 * One staff row on the Assigned Staff register.
 * Membership key remains `rosterCode` (= Staff.employment.roster).
 */
export type StaffRosterMemberRow = {
  id: string;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  phone: string;
  /** Derived from standing assignments when available; not day-duty allocation. */
  currentShift: string;
  rosterId: string;
  rosterCode: string;
  rosterName: string;
  /** Staff master status label (e.g. Active / Inactive). */
  status: string;
  assignmentCount: number;
  /** True when any standing Shift Assignment exists — blocks membership remove/move (INT-H1). */
  hasStandingAssignments: boolean;
};

/** Candidate shown in Add / Bulk Add sheet. */
export type StaffRosterAssignCandidate = {
  id: string;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  status: string;
  /** Current employment.roster code, if any. */
  currentRosterCode: string;
  currentRosterName: string;
  hasStandingAssignments: boolean;
};

export type GetStaffRosterMembersParams = {
  rosterId: string;
  staffId?: string;
  departmentId?: string;
  /** Staff.status as "0" | "1", or empty / `__all__`. */
  status?: string;
};

export type AssignStaffToManageRosterPayload = {
  rosterId: string;
  staffIds: string[];
  /** Required when any selected staff already belongs to another roster group. */
  confirmMove?: boolean;
};

export type RemoveStaffFromManageRosterPayload = {
  rosterId: string;
  staffIds: string[];
};

export type StaffRosterMembershipMutationResult = {
  updatedCount: number;
  skippedAlreadyOnRoster: number;
  movers: Array<{
    staffId: string;
    staffCode: string;
    staffName: string;
    currentRosterCode: string;
    currentRosterName: string;
  }>;
  locked: Array<{
    staffId: string;
    staffCode: string;
    staffName: string;
    assignmentCount: number;
  }>;
  requiresMoveConfirm?: boolean;
};
