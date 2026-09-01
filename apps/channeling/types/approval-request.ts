export const APPROVAL_REQUEST_TYPE = {
  CHANNEL_CANCEL: "channel_cancel",
  CHANNEL_REFUND: "channel_refund",
  BANK_DEPOSIT: "bank_deposit",
} as const

export type ApprovalRequestType =
  (typeof APPROVAL_REQUEST_TYPE)[keyof typeof APPROVAL_REQUEST_TYPE]

/**
 * status: 0=PENDING, 1=APPROVED, 2=REJECTED, 3=WITHDRAWN, 4=COMPLETED
 * (Int, aligned with FloatRequest / ShiftHandover).
 */
export const APPROVAL_REQUEST_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  WITHDRAWN: 3,
  COMPLETED: 4,
} as const

export type ApprovalRequestStatus =
  (typeof APPROVAL_REQUEST_STATUS)[keyof typeof APPROVAL_REQUEST_STATUS]

export function approvalRequestStatusLabel(status: number): string {
  switch (status) {
    case APPROVAL_REQUEST_STATUS.PENDING:
      return "Pending"
    case APPROVAL_REQUEST_STATUS.APPROVED:
      return "Approved"
    case APPROVAL_REQUEST_STATUS.REJECTED:
      return "Rejected"
    case APPROVAL_REQUEST_STATUS.WITHDRAWN:
      return "Withdrawn"
    case APPROVAL_REQUEST_STATUS.COMPLETED:
      return "Completed"
    default:
      return "Unknown"
  }
}

export const OPEN_APPROVAL_STATUSES: ApprovalRequestStatus[] = [
  APPROVAL_REQUEST_STATUS.PENDING,
  APPROVAL_REQUEST_STATUS.APPROVED,
]

export type ApprovalPaymentLineSnapshot = {
  payment_method: number
  amount: number
  bank?: { id: string; name?: string } | null
  slip_ref?: string
  slip_date?: string
  card?: string
}

export type BankDepositSnapshot = {
  bank_name?: string
  account_number?: string
  slip_ref?: string
  slip_date?: string
}

export type BookingApprovalSummary = {
  id: string
  type: ApprovalRequestType
  status: ApprovalRequestStatus
  requestedById: string
  requestedByName: string
  amount: number
  remarks: string
  refundTo: number | null
  professionalFee: number
  hospitalFee: number
  rejectReason: string | null
  createdAt: Date
}

export type ApprovalRequestListItem = BookingApprovalSummary & {
  bookingId: string | null
  patientName: string
  appointmentNo: number | null
  billNo: string
  sessionLabel: string
  detailTitle: string
  detailSub: string
  receiptId: string | null
  receiptNoString: string | null
  requestedAt: Date
  approvedAt: Date | null
  approvedByName: string | null
  rejectedAt: Date | null
  rejectedByName: string | null
}

export const APPROVAL_ACTION = {
  VIEW: "view",
  APPROVE_CHANNEL_CANCEL: "approve-channel-cancel",
  APPROVE_CHANNEL_REFUND: "approve-channel-refund",
  APPROVE_BANK_DEPOSIT: "approve-bank-deposit",
} as const
