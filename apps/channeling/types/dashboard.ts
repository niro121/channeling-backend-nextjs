export type DashboardKpiCount = {
  value: number
}

export type DashboardRevenueKpi = {
  value: number
}

export type DashboardRecentBookingRow = {
  id: string
  time: string
  patientName: string
  consultantName: string
  fee: number
}

export type DashboardQueueSnapshot = {
  activeRooms: number
  waiting: number
  shown: number
  noShow: number
}

/** Approval center work for the signed-in user. */
export type DashboardApprovalStats = {
  toAttend: number
  mineOpen: number
  cancels: number
  refunds: number
  deposits: number
}

/** Float requests the signed-in user still has to act on. */
export type DashboardFloatStats = {
  toApprove: number
  toReceive: number
}
