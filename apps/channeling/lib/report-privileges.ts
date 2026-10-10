import type { Permissions } from "@archmage/shared"

export const REPORT_CATEGORIES = [
  "Doctors",
  "Channel",
  "Agents",
  "Cashier",
  "SMS & System",
] as const

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

export type ReportPrivilege = {
  id: string
  action: string
  name: string
  description: string
  route: string
  category: ReportCategory
  rank: number
}

/**
 * One privilege per report on the reports page.
 * Action ids are stored on the user group under the `reports` resource.
 */
export const REPORT_PRIVILEGES: ReportPrivilege[] = [
  {
    id: "1",
    action: "arrivals",
    name: "Doctor Arrival Report",
    description: "View doctor arrivals information with filters",
    route: "/reports/arrivals",
    category: "Doctors",
    rank: 1,
  },
  {
    id: "2",
    action: "all-doctor-view",
    name: "All Doctor View",
    description: "View aggregated booking details by doctor and session time with filters",
    route: "/reports/all-doctor-view",
    category: "Doctors",
    rank: 2,
  },
  {
    id: "3",
    action: "doctor-leave",
    name: "Doctor Leave",
    description:
      "View doctor leave records with date & time range, filter by institution, branch, department, speciality, and doctor",
    route: "/reports/doctor-leave",
    category: "Doctors",
    rank: 3,
  },
  {
    id: "4",
    action: "doctor-appointment-count",
    name: "Doctor Appointment Count Report ( By Session Date )",
    description:
      "Counts are based on receipt entries matched to bookings by session date, with booking/session filter options.",
    route: "/reports/doctor-appointment-count",
    category: "Doctors",
    rank: 4,
  },
  {
    id: "6",
    action: "doctor-balance",
    name: "Doctor Balance Report",
    description:
      "View doctor payable balances as of a selected date, with doctor, speciality, and status filters.",
    route: "/reports/doctor-balance",
    category: "Doctors",
    rank: 5,
  },
  {
    id: "5",
    action: "channel-patient-count-accounting-wise",
    name: "Channel Patient Count (Accounting Wise)",
    description: "Channel booking count and accounting-wise fee summary by date range and branch.",
    route: "/reports/channel-patient-count-accounting-wise",
    category: "Channel",
    rank: 6,
  },
  {
    id: "7",
    action: "channel-income-accounting-wise",
    name: "Channel Income Report (Accounting Wise)",
    description: "Income totals grouped by booking channel type (excluding API/PCR).",
    route: "/reports/channel-income-accounting-wise",
    category: "Channel",
    rank: 7,
  },
  {
    id: "9",
    action: "channel-discount",
    name: "Channel Discount Report",
    description:
      "Shows billed channel bookings with hospital/professional fee discounts and discount schemes.",
    route: "/reports/channel-discount",
    category: "Channel",
    rank: 8,
  },
  {
    id: "10",
    action: "consultant-payments",
    name: "Consultant Payments Report",
    description:
      "View consultant (doctor) payments for channeling bookings with filters for date & time range, institution, branch, department, speciality, doctor, and payment status",
    route: "/reports/consultant-payments",
    category: "Channel",
    rank: 9,
  },
  {
    id: "21",
    action: "channel-bookings",
    name: "Channel Booking Details",
    description:
      "View channel booking records with filters for date & time range, data type, institution, branch, speciality, doctor, status, refund status, area, agency, patient phone, gender, payment type, and method",
    route: "/reports/channel-bookings",
    category: "Channel",
    rank: 10,
  },
  {
    id: "30",
    action: "channel-schedule-with-charges",
    name: "Channel Schedule With Charges",
    description:
      "View doctor sessions with charge breakdown filtered by institution, branch, department, speciality, doctor, and report type.",
    route: "/reports/channel-schedule-with-charges",
    category: "Channel",
    rank: 11,
  },
  {
    id: "33",
    action: "channel-transfer",
    name: "Channel Transfer Report",
    description:
      "View booking transfers with From/To session details using activity log + booking/session data.",
    route: "/reports/channel-transfer",
    category: "Channel",
    rank: 12,
  },
  {
    id: "36",
    action: "room-occupancy",
    name: "Room Occupancy",
    description:
      "Highlights booked room hours by date and shows total booked hours from session start/end time.",
    route: "/reports/room-occupancy",
    category: "Channel",
    rank: 13,
  },
  {
    id: "40",
    action: "channel-report-receipt-wise",
    name: "Receipt Report",
    description:
      "Shows all receipts for a date/time range with type filter (all, channel, other) and receipt number.",
    route: "/reports/channel-report-receipt-wise",
    category: "Channel",
    rank: 14,
  },
  {
    id: "42",
    action: "no-show-patient",
    name: "No Show Patient Report",
    description: "Shows no-show patient counts by speciality and doctor, with by-date or by-month summary.",
    route: "/reports/no-show-patient",
    category: "Channel",
    rank: 15,
  },
  {
    id: "27",
    action: "withholding-tax",
    name: "Withholding Tax Report",
    description:
      "Doctor payments with WHT; filter by date & time range, consultant, speciality, branch, and detail or summary.",
    route: "/reports/withholding-tax",
    category: "Channel",
    rank: 16,
  },
  {
    id: "11",
    action: "channel-agent-reference-book",
    name: "Channel Agent Reference Book",
    description: "View channel agent reference book information with filters",
    route: "/reports/channel-agent-reference-book",
    category: "Agents",
    rank: 17,
  },
  {
    id: "14",
    action: "agent-detail",
    name: "Agent Details",
    description: "View agent information with filters",
    route: "/reports/agent-detail",
    category: "Agents",
    rank: 18,
  },
  {
    id: "15",
    action: "agency-statement",
    name: "Agent Statement",
    description:
      "Agent-wise statement with opening/closing balance and receipt details enriched with booking fee breakdown when available.",
    route: "/reports/agency-statement",
    category: "Agents",
    rank: 19,
  },
  {
    id: "16",
    action: "channel-agent-receipt",
    name: "Channel Agent Receipt",
    description: "Search all receipts linked to bookings by Book No prefix and/or Agency.",
    route: "/reports/channel-agent-receipt",
    category: "Agents",
    rank: 20,
  },
  {
    id: "18",
    action: "agent-balance",
    name: "Agent Balance Report",
    description:
      "View agent balances with status filter using agency soft limit, associated account hard limit, and live account balance.",
    route: "/reports/agent-balance",
    category: "Agents",
    rank: 21,
  },
  {
    id: "21a",
    action: "agent-wise-appointments",
    name: "Agent Wise Appointments - Summary and Detail",
    description:
      "Agent and API appointments by receipt/refund date with institution, branch, department, and agent filters; summary counts per month or full detail with fee totals.",
    route: "/reports/agent-wise-appointments",
    category: "Agents",
    rank: 22,
  },
  {
    id: "32",
    action: "agent-history-credit-limit-update",
    name: "Agent History(Credit Limit Update)",
    description: "Track changes to agent soft/hard credit limits from the activity log.",
    route: "/reports/agent-history-credit-limit-update",
    category: "Agents",
    rank: 23,
  },
  {
    id: "36a",
    action: "agent-collection-receipt",
    name: "Agent Collection Receipt Report",
    description: "Shows agent deposits/withdrawals and cancellations by payment type, with totals.",
    route: "/reports/agent-collection-receipt",
    category: "Agents",
    rank: 24,
  },
  {
    id: "38",
    action: "agent-balance-confirmation-letter",
    name: "Agency Balance Confirmation Letter",
    description: "Check agency balance confirmation letter.",
    route: "/reports/agent-balance-confirmation-letter",
    category: "Agents",
    rank: 25,
  },
  {
    id: "24",
    action: "all-cashier-summary-detail",
    name: "All Cashier Summary and Detail Report",
    description:
      "All-cashier report with date/time, branch, and user filters; supports Summary and Detail formats with print, PDF, and Excel.",
    route: "/reports/all-cashier-summary-detail",
    category: "Cashier",
    rank: 26,
  },
  {
    id: "25",
    action: "cashier-summary",
    name: "Userwise Cashier Detail - Channel",
    description:
      "User-wise cashier summary by date range with optional branch and user filters; Summary (refunds in detail) or Detail (all transactions). Print, PDF, and Excel.",
    route: "/reports/cashier-summary",
    category: "Cashier",
    rank: 27,
  },
  {
    id: "34",
    action: "cashier-drawer-balance",
    name: "Cashier Drawer Balance",
    description: "Shows all tills and their balances by payment method for the selected date.",
    route: "/reports/cashier-drawer-balance",
    category: "Cashier",
    rank: 28,
  },
  {
    id: "44",
    action: "cashier-short-balance",
    name: "Cashier Short Balance",
    description:
      "Shows each cashier short account balance by payment method as of the selected date and time.",
    route: "/reports/cashier-short-balance",
    category: "Cashier",
    rank: 29,
  },
  {
    id: "34a",
    action: "daily-returns-summary",
    name: "Daily Returns Summary",
    description:
      "Receipt-based daily float summary by receipt type (Settlement, Refund, Doctor Payment, Agency Deposit, Branch Income, Bank Deposit, Cash Voucher, etc.) for a selected date.",
    route: "/reports/daily-returns-summary",
    category: "Cashier",
    rank: 30,
  },
  {
    id: "35",
    action: "card-summary-bank-wise",
    name: "Card Summary - Bank Wise",
    description: "Lists card transactions by bank with Summary and Detail views.",
    route: "/reports/card-summary-bank-wise",
    category: "Cashier",
    rank: 31,
  },
  {
    id: "37",
    action: "cash-book",
    name: "Cash Book",
    description: "Statement-style report for a selected cash book within a date range.",
    route: "/reports/cash-book",
    category: "Cashier",
    rank: 32,
  },
  {
    id: "39",
    action: "bank-deposits",
    name: "Bank Deposits",
    description: "Lists bank deposit receipts with date/time range and bank account filters.",
    route: "/reports/bank-deposits",
    category: "Cashier",
    rank: 33,
  },
  {
    id: "39b",
    action: "cash-vouchers",
    name: "Cash Vouchers",
    description: "Lists cash voucher receipts that convert reconciled non-cash balances into till cash.",
    route: "/reports/cash-vouchers",
    category: "Cashier",
    rank: 33.5,
  },
  {
    id: "40b",
    action: "completed-handovers",
    name: "Handovers Report",
    description:
      "View pending, approved, and rejected shift handovers for any user, with sender, recipient, handover status, and reconciliation status filters.",
    route: "/reports/completed-handovers",
    category: "Cashier",
    rank: 34,
  },
  {
    id: "41",
    action: "approval-requests",
    name: "Approval Requests Report",
    description:
      "View Approval Center cancellations, refunds, bank deposits, and cash vouchers for a period, including who requested, approved, and rejected each item.",
    route: "/reports/approval-requests",
    category: "Cashier",
    rank: 35,
  },
  {
    id: "29",
    action: "sms-reports",
    name: "SMS Reports",
    description:
      "View SMS log entries with date & time range and status filters, with print/PDF/Excel export.",
    route: "/reports/sms-reports",
    category: "SMS & System",
    rank: 36,
  },
  {
    id: "31",
    action: "api-log",
    name: "API LOG REPORT",
    description: "View API request logs with date & time range and filter by UUID",
    route: "/reports/api-log",
    category: "SMS & System",
    rank: 37,
  },
  {
    id: "43",
    action: "user-activity",
    name: "User Activity Report",
    description: "View user activity logs with filters for date/time, user, action, and entity details.",
    route: "/reports/user-activity",
    category: "SMS & System",
    rank: 38,
  },
]

export const REPORT_PERMISSION_ACTIONS: { id: string; name: string }[] = [
  { id: "view", name: "View reports list" },
  ...REPORT_PRIVILEGES.map((report) => ({ id: report.action, name: report.name })),
]

const PRIVILEGE_BY_ACTION = new Map(REPORT_PRIVILEGES.map((report) => [report.action, report]))
const PRIVILEGE_BY_ROUTE = new Map(REPORT_PRIVILEGES.map((report) => [report.route, report]))

function reportPath(route: string): string {
  const path = route.split("?")[0].replace(/\/$/, "")
  return path || "/reports"
}

export function reportPrivilegeForRoute(route: string): ReportPrivilege | null {
  const path = reportPath(route)
  return PRIVILEGE_BY_ROUTE.get(path) ?? null
}

export function reportPrivilegeForAction(action: string): ReportPrivilege | null {
  return PRIVILEGE_BY_ACTION.get(action) ?? null
}

/**
 * True when this group may open and run the report.
 * An explicit true allows it. An explicit false blocks it.
 * A missing flag follows View reports list, so existing groups keep every report
 * until that report is turned off.
 */
export function canViewReport(
  permissions: Permissions | null | undefined,
  routeOrAction: string
): boolean {
  const privilege =
    reportPrivilegeForAction(routeOrAction) ?? reportPrivilegeForRoute(routeOrAction)
  if (!privilege) return false
  const reports = permissions?.reports
  if (!reports) return false
  const specific = reports[privilege.action]
  if (specific === true) return true
  if (specific === false) return false
  return reports.view === true
}

export function reportPrivilegeChecked(
  reports: Record<string, boolean> | undefined,
  action: string
): boolean {
  const specific = reports?.[action]
  if (specific === true) return true
  if (specific === false) return false
  return reports?.view === true
}

/** Open the reports page when the group can see the list or at least one report. */
export function canOpenReportsCatalog(permissions: Permissions | null | undefined): boolean {
  const reports = permissions?.reports
  if (!reports) return false
  if (reports.view === true) return true
  return REPORT_PRIVILEGES.some((report) => reports[report.action] === true)
}

/**
 * Catalog and each report route.
 * Screens under /reports that are not in the catalog (session views)
 * stay on View reports list. SMS Activity has its own privilege.
 */
export function canAccessReportPath(
  permissions: Permissions | null | undefined,
  route: string
): boolean {
  const path = reportPath(route)
  if (path === "/reports") return canOpenReportsCatalog(permissions)
  if (reportPrivilegeForRoute(path)) return canViewReport(permissions, path)
  return permissions?.reports?.view === true
}
