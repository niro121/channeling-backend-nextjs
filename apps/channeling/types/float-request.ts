/**
 * Float request: cashier requests float at shift start; bulk cashier approves/rejects.
 * Amounts in smallest unit (e.g. cents). Denominations in LKR (rupees).
 * status: 0=PENDING, 1=APPROVED, 2=RECEIVED, 3=REJECTED, 4=CANCELLED (Int, aligned with rest of schema).
 */

export const FLOAT_REQUEST_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  RECEIVED: 2,
  REJECTED: 3,
  CANCELLED: 4,
} as const;

export type FloatRequestStatus = (typeof FLOAT_REQUEST_STATUS)[keyof typeof FLOAT_REQUEST_STATUS];

/** Single denomination: value in LKR (e.g. 5000), count of notes */
export type DenominationEntry = { value: number; count: number };

export type FloatRequest = {
  id: string;
  requestedById: string;
  bulkCashierId: string;
  status: number; // 0=PENDING, 1=APPROVED, 2=RECEIVED, 3=REJECTED, 4=CANCELLED
  amountRequested: number;
  denominationsRequested: DenominationEntry[];
  denominationsApproved: DenominationEntry[] | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  toTillId: string | null;
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
  receiveCode: string | null;
  receivedAt: Date | null;
  receivedById: string | null;
  journalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  floatNo: number | null;
  floatNoString: string | null;
  requestedBy?: { id: string; name: string; email?: string } | null;
  bulkCashier?: { id: string; name: string; email?: string } | null;
  fromAccount?: { id: string; name: string; code: string | null } | null;
  toAccount?: { id: string; name: string; code: string | null } | null;
  toTill?: { id: string; locationId: string; accountId: string } | null;
  receivedBy?: { id: string; name: string } | null;
  shift?: { id: string; startedAt: Date } | null;
};

/** Print slip data returned after approving a float request (code, QR payload, details). */
export type FloatRequestPrintData = {
  floatRequestId: string;
  floatNoString?: string | null;
  receiveCode: string;
  amountLKR: number;
  denominationsApproved: DenominationEntry[];
  requestedByName: string;
  bulkCashierName: string;
  approvedAt: string; // ISO
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

export type ReceiveFloatRequestInput = {
  floatRequestId: string;
  receiveCode: string;
  receivedById: string;
};

/** Cashier declines to receive an approved float (cancels the handover; no journal entry). */
export type DeclineApprovedFloatRequestInput = {
  floatRequestId: string;
  declinedBy: string;
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

const FLOAT_REQUEST_STATUS_LABELS: Record<number, string> = {
  [FLOAT_REQUEST_STATUS.PENDING]: 'PENDING',
  [FLOAT_REQUEST_STATUS.APPROVED]: 'APPROVED',
  [FLOAT_REQUEST_STATUS.RECEIVED]: 'RECEIVED',
  [FLOAT_REQUEST_STATUS.REJECTED]: 'REJECTED',
  [FLOAT_REQUEST_STATUS.CANCELLED]: 'CANCELLED',
};

/** Human-readable label for float request status (for display in UI). */
export function floatRequestStatusLabel(status: number): string {
  return FLOAT_REQUEST_STATUS_LABELS[status] ?? String(status);
}
