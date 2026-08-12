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
