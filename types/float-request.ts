/**
 * Float request: cashier requests float at shift start; bulk cashier approves/rejects.
 * Amounts in smallest unit (e.g. cents). Denominations in LKR (rupees).
 */

import type { FloatRequestStatus as PrismaFloatRequestStatus } from '@prisma/client';

export type FloatRequestStatus = PrismaFloatRequestStatus;

export const FLOAT_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

/** Single denomination: value in LKR (e.g. 5000), count of notes */
export type DenominationEntry = { value: number; count: number };

export type FloatRequest = {
  id: string;
  requestedById: string;
  bulkCashierId: string;
  status: FloatRequestStatus;
  amountRequested: number;
  denominationsRequested: DenominationEntry[];
  denominationsApproved: DenominationEntry[] | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  shiftId: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  rejectReason: string | null;
  cancelReason: string | null;
  reasonForLessThanRequested: string | null;
  journalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { id: string; name: string; email?: string } | null;
  bulkCashier?: { id: string; name: string; email?: string } | null;
  fromAccount?: { id: string; name: string; code: string | null } | null;
  toAccount?: { id: string; name: string; code: string | null } | null;
  shift?: { id: string; startedAt: Date } | null;
};

export type CreateFloatRequestInput = {
  requestedById: string;
  bulkCashierId: string;
  amountRequested: number;
  denominationsRequested: DenominationEntry[];
  shiftId?: string | null;
};

export type ApproveFloatRequestInput = {
  floatRequestId: string;
  approvedBy: string;
  fromAccountId: string;
  denominationsApproved: DenominationEntry[];
  /** Required when approved amount is less than requested */
  reasonForLessThanRequested?: string | null;
};

export type RejectFloatRequestInput = {
  floatRequestId: string;
  rejectedBy: string;
  reason: string;
};

export type CancelFloatRequestInput = {
  floatRequestId: string;
  cancelledBy: string;
  reason: string;
};

/** Sum of denominations in smallest unit (value * count, then sum; value is LKR so * 100 for cents) */
export function denominationsTotalLKR(entries: DenominationEntry[]): number {
  return entries.reduce((sum, e) => sum + e.value * e.count, 0);
}

/** Convert LKR to smallest unit (cents) */
export function lkrToCents(lkr: number): number {
  return Math.round(lkr * 100);
}

/** Rupee notes/coins only (5000 down to 1). */
export const LKR_DENOMINATIONS_RUPEES: number[] = [
  5000, 2000, 1000, 500, 100, 50, 20, 10, 5, 1,
];

/** Cents / small change (optional). Value in LKR (e.g. 0.5 = 50¢). */
export const LKR_DENOMINATIONS_CENTS: number[] = [
  0.5, 0.25, 0.1, 0.05, 0.01,
];

/** All denominations (rupees + cents). */
export const LKR_DENOMINATIONS: number[] = [
  ...LKR_DENOMINATIONS_RUPEES,
  ...LKR_DENOMINATIONS_CENTS,
];

/** Format denomination value for display: rupees as number, &lt; 1 LKR as decimal (e.g. ".50"). */
export function formatDenomLabel(valueLkr: number): string {
  if (valueLkr >= 1) return Number.isInteger(valueLkr) ? valueLkr.toString() : valueLkr.toFixed(2);
  return valueLkr.toFixed(2).replace(/^0/, ''); // ".50", ".25", ".10", ".05", ".01"
}
