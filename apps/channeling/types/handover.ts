export const HANDOVER_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  CANCELLED: 3,
} as const

export type HandoverStatus = (typeof HANDOVER_STATUS)[keyof typeof HANDOVER_STATUS]

/** Back-office reconciliation lifecycle (ShiftHandover.reconciliationStatus). */
export const RECONCILIATION_STATUS = {
  PENDING: 0, // When shift is hand overed
  IN_RECONCILIATION: 1, // When approved
  RECONCILED_APPROVED: 2,
  RECONCILED_REJECTED: 3,
} as const

export type ReconciliationStatusType = (typeof RECONCILIATION_STATUS)[keyof typeof RECONCILIATION_STATUS]
