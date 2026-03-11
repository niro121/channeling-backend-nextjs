export const HANDOVER_STATUS = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
  CANCELLED: 3,
} as const

export type HandoverStatus = (typeof HANDOVER_STATUS)[keyof typeof HANDOVER_STATUS]
