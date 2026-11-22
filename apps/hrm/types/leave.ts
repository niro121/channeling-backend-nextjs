import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** Prefix for `generateRecordCode` → e.g. `LT-1`, `LT-2`. */
export const LEAVE_TYPE_CODE_PREFIX = 'LT';

/**
 * Leave application form numbers use `generateRecordCode(staffCode)` → e.g. `ST-1-1`.
 * Scope key is `record:{STAFF_CODE}` via the shared record-code generator.
 */
export const LEAVE_APPLICATION_FORM_SCOPE = 'leave-application';

/** Process Lieu Shift — civil-day lookback before leave `fromDate` (Asia/Colombo). */
export const LIEU_SOURCE_LOOKBACK_DAYS = 90;

/** Days credited to the Lieu bank per Public Holiday Grant Lieu Leave. */
export const LIEU_GRANT_DAYS = 1;

/** Live preview for Public Holiday “Grant Lieu Leave” switch. */
export type LieuGrantPreview = {
  hasPublishedLieuType: boolean;
  leaveTypeCode: string | null;
  leaveTypeName: string | null;
  periodFrom: string;
  periodTo: string;
  periodLabel: string;
  entitled: number;
  used: number;
  remaining: number;
  /** Lieu days already credited this calendar year (same as entitled for this bank). */
  daysEarnedThisYear: number;
  grantDays: number;
  afterGrantEntitled: number;
  afterGrantRemaining: number;
  alreadyGrantedForAllocation: boolean;
  message?: string;
};

export const LEAVE_APPLICATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled'
] as const;

export type LeaveApplicationStatus = (typeof LEAVE_APPLICATION_STATUSES)[number];

/** Stored on LeaveApplication.halfDaySession when days = 0.5. */
export const LEAVE_HALF_DAY_SESSIONS = ['AM', 'PM'] as const;
export type LeaveHalfDaySession = (typeof LEAVE_HALF_DAY_SESSIONS)[number];

export const LEAVE_HALF_DAY_SESSION_OPTIONS = [
  { id: 'AM', name: 'Morning' },
  { id: 'PM', name: 'Afternoon' }
] as const;

export type LeaveApplicationShiftRow = {
  shiftLabel: string;
  from: string | Date;
  to: string | Date;
  shiftDate?: string | Date | null;
  department?: string | null;
  allocationId?: string | null;
};

/** Published / amended roster duties loaded by Process Shift for a leave period. */
export type LeaveProcessedDutyRow = {
  allocationId: string;
  shiftLabel: string;
  department: string;
  from: Date;
  to: Date;
  shiftDate: Date;
  startTime: string;
  endTime: string;
};

/** Process Lieu Shift Phase A — grantLieuLeave source duties for the combobox. */
export type LeaveLieuSourceDutyRow = LeaveProcessedDutyRow & {
  /** Combobox display label (includes duty date). */
  optionLabel: string;
};

export type LeaveApplicationRecord = {
  id: string;
  formNumber: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  leaveType: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  days: number;
  requestedDate?: string | null;
  approverId: string | null;
  approverName: string;
  status: LeaveApplicationStatus | string;
  outWithCancel: boolean;
  comment?: string | null;
  approvedAt: string | null;
  shiftDate: string;
  lieuShiftId?: string | null;
  lieuShiftLabel?: string | null;
  entitleSnapshot?: number | null;
  utilizedSnapshot?: number | null;
  balanceSnapshot?: number | null;
  shifts?: LeaveApplicationShiftRow[];
  allowHalfDay?: boolean;
  isHalfDay?: boolean;
  /** "AM" | "PM" when half-day; null/undefined for full-day. */
  halfDaySession?: LeaveHalfDaySession | string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
};

export type GetLeaveApplicationsParams = {
  page?: string;
  limit?: string;
  staffId?: string;
  leaveTypeId?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
  /** created | approved | shift */
  dateSearchBy?: string;
  /** all | yes | no */
  outWithCancel?: string;
};

export type GetLeaveApplicationsReturn = {
  data: LeaveApplicationRecord[];
  totalRecords: number;
};

/** Client Formik values for leave application form. */
export type LeaveApplicationFormValues = {
  formNumber: string;
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | null;
  toDate: Date | null;
  requestedDate: Date | null;
  approverId: string;
  approvedDate: Date | null;
  lieuShiftId: string;
  comment: string;
  outWithCancel: boolean;
  isHalfDay: boolean;
  /** "" until user picks Morning/Afternoon; payload maps to AM|PM|null. */
  halfDaySession: string;
};

/** Statuses that may be hard-deleted (approved must Cancel first). */
export const LEAVE_APPLICATION_DELETABLE_STATUSES = [
  'pending',
  'rejected',
  'cancelled'
] as const;

export type LeaveApplicationDeletableStatus =
  (typeof LEAVE_APPLICATION_DELETABLE_STATUSES)[number];

export type LeaveApplicationPayload = {
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | string;
  toDate: Date | string;
  requestedDate?: Date | string | null;
  approverId?: string | null;
  comment?: string | null;
  outWithCancel?: boolean;
  isHalfDay?: boolean;
  halfDaySession?: LeaveHalfDaySession | string | null;
  lieuShiftId?: string | null;
  lieuShiftLabel?: string | null;
  entitleSnapshot?: number | null;
  utilizedSnapshot?: number | null;
  balanceSnapshot?: number | null;
  shifts?: LeaveApplicationShiftRow[];
  /** Continue after soft warn when published duties overlap leave dates (auto-approve). */
  acknowledgedWarnings?: boolean;
};

export const LEAVE_ENTITLEMENT_STATUSES = [
  'active',
  'pending',
  'expired'
] as const;

export type LeaveEntitlementStatus = (typeof LEAVE_ENTITLEMENT_STATUSES)[number];

export const LEAVE_ENTITLEMENT_STATUS_OPTIONS = [
  { id: 'active', name: 'Active' },
  { id: 'pending', name: 'Pending' },
  { id: 'expired', name: 'Expired' }
] as const;

export type LeaveEntitlementRecord = {
  id: string;
  staffId: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  /** True when leave type is the Lieu bank (PH grants; not manually allotted). */
  isLieuLeave?: boolean;
  staffName?: string;
  staffCode?: string;
  fromDate: string | Date;
  toDate: string | Date;
  entitled: number;
  used: number;
  remaining: number;
  carryForward: number;
  status: LeaveEntitlementStatus | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
};

export type GetLeaveEntitlementsParams = {
  page?: string;
  limit?: string;
  staffId?: string;
  leaveTypeId?: string;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
};

export type GetLeaveEntitlementsReturn = {
  data: LeaveEntitlementRecord[];
  totalRecords: number;
};

/** Client Formik values for entitlement form. */
export type LeaveEntitlementFormValues = {
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | null;
  toDate: Date | null;
  entitled: string;
  carryForward: string;
  status: string;
};

/** Published leave type option for entitlement form (includes policy caps). */
export type LeaveTypeEntitlementOption = {
  id: string;
  name: string;
  code?: string;
  isLieuLeave?: boolean;
  carryForwardAllowed: boolean;
  maxDaysPerYear: number | null;
  maxCarryForwardDays: number | null;
};

export type LeaveEntitlementPayload = {
  staffId: string;
  leaveTypeId: string;
  fromDate: Date | string;
  toDate: Date | string;
  entitled: number;
  carryForward?: number;
  status?: LeaveEntitlementStatus | string;
};

export type LeaveEntitlementBalanceLeaveType = {
  leaveTypeId: string;
  leaveTypeName: string;
  entitled: number;
  used: number;
  remaining: number;
  carryForward: number;
};

export type LeaveEntitlementBalanceSummary = {
  totalEntitlement: number;
  used: number;
  remaining: number;
  carryForward: number;
  leaveTypes: LeaveEntitlementBalanceLeaveType[];
  utilisations: { label: string; percent: number }[];
};

export const LEAVE_TYPE_STATUS = {
  UNPUBLISHED: 0,
  PUBLISHED: 1
} as const;

export type LeaveTypeStatusValue =
  (typeof LEAVE_TYPE_STATUS)[keyof typeof LEAVE_TYPE_STATUS];

export type LeaveTypeRecord = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  status: number;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  isLieuLeave: boolean;
  carryForwardAllowed: boolean;
  maxDaysPerYear?: number | null;
  maxCarryForwardDays?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
};

/** Slim row from `getLieuLeaveType` (existence / Add Lieu CTA). */
export type LieuLeaveTypeSummary = Pick<
  LeaveTypeRecord,
  'id' | 'code' | 'name' | 'status'
>;

/** Published leave type option for application / entitlement selects. */
export type LeaveTypeOption = Pick<
  LeaveTypeRecord,
  | 'id'
  | 'name'
  | 'code'
  | 'allowHalfDay'
  | 'isLieuLeave'
  | 'requiresApproval'
  | 'carryForwardAllowed'
> & {
  maxDaysPerYear: number | null;
  maxCarryForwardDays: number | null;
};

export type GetLeaveTypesParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  status?: string;
  isPaid?: string;
  requiresApproval?: string;
  allowHalfDay?: string;
  isLieuLeave?: string;
};

export type GetLeaveTypesReturn = {
  data: LeaveTypeRecord[];
  totalRecords: number;
};

/** Client Formik values (string selects for CustomSelectField). */
export type LeaveTypeFormValues = {
  code: string;
  name: string;
  description: string;
  isPaid: string; // yes | no
  requiresApproval: string; // yes | no
  allowHalfDay: string; // yes | no
  isLieuLeave: boolean;
  carryForwardAllowed: string; // yes | no
  maxDaysPerYear: string;
  maxCarryForwardDays: string;
  status: string; // 1 | 0
};

/** Server payload after form → mapper (booleans / numbers). Code is server-only. */
export type LeaveTypePayload = {
  name: string;
  description?: string | null;
  isPaid: boolean;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  isLieuLeave: boolean;
  carryForwardAllowed: boolean;
  maxDaysPerYear?: number | null;
  maxCarryForwardDays?: number | null;
  status: number;
};

/** Prefer multiples of 0.5 for whole / half days. */
export function isValidLeaveDayAmount(days: number): boolean {
  if (!Number.isFinite(days) || days < 0) return false;
  return Math.abs(days * 2 - Math.round(days * 2)) < 1e-9;
}

export function computeEntitlementRemaining(
  entitled: number,
  carryForward: number,
  used: number
): number {
  return entitled + carryForward - used;
}
