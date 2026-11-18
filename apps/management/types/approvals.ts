/**
 * Shapes returned by channeling's /api/management/approvals routes.
 * Mirrors apps/channeling/types/approval-request.ts (display fields only — no rules live here).
 */
export const APPROVAL_TYPE = {
  CHANNEL_CANCEL: 'channel_cancel',
  CHANNEL_REFUND: 'channel_refund',
  BANK_DEPOSIT: 'bank_deposit',
  CASH_VOUCHER: 'cash_voucher'
} as const;

export type ApprovalType = (typeof APPROVAL_TYPE)[keyof typeof APPROVAL_TYPE];
export type ApprovalTypeFilter = 'all' | ApprovalType;
export type ApprovalView = 'attend' | 'mine';

/** 0=PENDING, 1=APPROVED, 2=REJECTED, 3=WITHDRAWN, 4=COMPLETED */
export const APPROVAL_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  WITHDRAWN: 3,
  COMPLETED: 4
} as const;

export type ApprovalAccess = {
  canOpen: boolean;
  canSeeMine: boolean;
  canAttend: boolean;
  canSeeCancels: boolean;
  canSeeRefunds: boolean;
  canSeeDeposits: boolean;
  canSeeCashVouchers: boolean;
  canApproveCancel: boolean;
  canApproveRefund: boolean;
  canApproveBankDeposit: boolean;
  canApproveCashVoucher: boolean;
};

export type ApprovalItem = {
  id: string;
  type: ApprovalType;
  status: number;
  requestedById: string;
  requestedByName: string;
  amount: number;
  remarks: string;
  professionalFee: number;
  hospitalFee: number;
  rejectReason: string | null;
  bookingId: string | null;
  patientName: string;
  doctorName: string;
  appointmentNo: number | null;
  billNo: string;
  sessionLabel: string;
  detailTitle: string;
  detailSub: string;
  paymentMethodName: string;
  paymentTypeName: string;
  refundMethodName: string;
  checkedConfirmations: string[];
  receiptNoString: string | null;
  slipImageUrl: string | null;
  requestedAt: string;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectedAt: string | null;
  rejectedByName: string | null;
};

export type ApprovalListResult =
  | { success: true; data: ApprovalItem[]; total: number; page: number; limit: number; access: ApprovalAccess }
  | { success: false; errorCode: string; message: string; access?: ApprovalAccess | null };

export type ApprovalActionResult =
  | { success: true; data?: { id: string; receiptNoString?: string } }
  | { success: false; errorCode: string; message: string };

export function approvalTypeLabel(type: string): string {
  if (type === APPROVAL_TYPE.CHANNEL_CANCEL) return 'Cancel';
  if (type === APPROVAL_TYPE.BANK_DEPOSIT) return 'Bank deposit';
  if (type === APPROVAL_TYPE.CASH_VOUCHER) return 'Cash voucher';
  return 'Refund';
}

export function approvalStatusLabel(status: number): string {
  switch (status) {
    case APPROVAL_STATUS.PENDING:
      return 'Pending';
    case APPROVAL_STATUS.APPROVED:
      return 'Approved';
    case APPROVAL_STATUS.REJECTED:
      return 'Rejected';
    case APPROVAL_STATUS.WITHDRAWN:
      return 'Withdrawn';
    case APPROVAL_STATUS.COMPLETED:
      return 'Completed';
    default:
      return String(status);
  }
}

/** UI hint only — channeling decides. */
export function canApproveType(access: ApprovalAccess | null, type: string): boolean {
  if (!access) return false;
  if (type === APPROVAL_TYPE.CHANNEL_CANCEL) return access.canApproveCancel;
  if (type === APPROVAL_TYPE.CHANNEL_REFUND) return access.canApproveRefund;
  if (type === APPROVAL_TYPE.BANK_DEPOSIT) return access.canApproveBankDeposit;
  if (type === APPROVAL_TYPE.CASH_VOUCHER) return access.canApproveCashVoucher;
  return false;
}
