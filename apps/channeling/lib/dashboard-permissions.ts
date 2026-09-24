/** Welcome dashboard resource and per-module actions (user group permissions). */
export const DASHBOARD_RESOURCE = "dashboard"

export const DASHBOARD_MODULES = {
  shiftStatus: "shift-status",
  todayBookings: "today-bookings",
  todayRevenue: "today-revenue",
  sessionsToday: "sessions-today",
  recentBookings: "recent-bookings",
  queueSnapshot: "queue-snapshot",
} as const

export type DashboardModuleAction =
  (typeof DASHBOARD_MODULES)[keyof typeof DASHBOARD_MODULES]
