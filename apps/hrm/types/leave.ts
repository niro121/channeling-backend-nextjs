import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** Prefix for `generateRecordCode` → e.g. `LT-1`, `LT-2`. */
export const LEAVE_TYPE_CODE_PREFIX = 'LT';

/**
 * Sequence.scopeKey for leave application form numbers (Phase 3).
 * Prefer `getNextSequenceNumber(LEAVE_APPLICATION_FORM_SCOPE)` or a dedicated
 * `generateRecordCode` prefix when implementing applications.
 */
export const LEAVE_APPLICATION_FORM_SCOPE = 'leave-application';

export const LEAVE_APPLICATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled'
] as const;

export type LeaveApplicationStatus = (typeof LEAVE_APPLICATION_STATUSES)[number];

export const LEAVE_ENTITLEMENT_STATUSES = [
  'active',
  'expired',
  'pending'
] as const;

export type LeaveEntitlementStatus = (typeof LEAVE_ENTITLEMENT_STATUSES)[number];

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

export type GetLeaveTypesParams = {
  page?: string;
  limit?: string;
  keyword?: string;
  status?: string;
  isPaid?: string;
  requiresApproval?: string;
  allowHalfDay?: string;
};

/** Client Formik values (string selects for CustomSelectField). */
export type LeaveTypeFormValues = {
  code: string;
  name: string;
  description: string;
  isPaid: string; // yes | no
  requiresApproval: string; // yes | no
  allowHalfDay: string; // yes | no
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
