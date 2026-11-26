/**
 * Channel insights for the management app Overview (apps/management mirrors these shapes).
 * Every module is for a session-date range (Colombo calendar days) compared with the
 * period of the same length just before it.
 */

export const INSIGHT_RESOURCE = "management-overview"

export const INSIGHT_MODULES = [
  "revenue",
  "bookings",
  "top-doctors",
  "session-fill",
  "booking-behaviour",
  "leakage",
  "specialities",
] as const

export type InsightModule = (typeof INSIGHT_MODULES)[number]

export type InsightRange = {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
  days: number
  previousFrom: string
  previousTo: string
}

/** null when there is nothing to compare against. */
export type Change = number | null

export type RevenueInsight = {
  value: number
  previous: number
  change: Change
  paidBookings: number
  averagePerBooking: number
  series: { date: string; value: number }[]
}

export type ChannelMixRow = {
  method: number
  name: string
  bookings: number
  revenue: number
  share: number
  previousBookings: number
  change: Change
}

export type BookingsInsight = {
  total: number
  paid: number
  unpaid: number
  cancelled: number
  previousTotal: number
  change: Change
  channels: ChannelMixRow[]
}

export type TopDoctorRow = {
  doctorId: string
  name: string
  speciality: string | null
  bookings: number
  revenue: number
  sessions: number
  fillRate: number | null
  previousBookings: number
  change: Change
}

export type SessionFillRow = {
  sessionId: string
  doctorName: string
  date: string
  time: string
  booked: number
  capacity: number
  fillRate: number
}

export type SessionFillInsight = {
  sessions: number
  capacity: number
  booked: number
  fillRate: number | null
  previousFillRate: number | null
  fullSessions: number
  fillingFast: SessionFillRow[]
  underBooked: SessionFillRow[]
}

export type BookingBehaviourInsight = {
  total: number
  byHour: number[] // 24 buckets, Colombo time the booking was made
  peakHour: number | null
  leadTime: { sameDay: number; oneToTwoDays: number; threeToSevenDays: number; moreThanWeek: number }
  averageLeadDays: number | null
}

export type LeakageInsight = {
  bookings: number
  cancelled: number
  cancelRate: number | null
  refundAmount: number
  marked: number
  noShow: number
  noShowRate: number | null
  onCallPast: number
  onCallUnpaid: number
  onCallConversion: number | null
  unpaidValue: number
}

export type SpecialityRow = {
  name: string
  bookings: number
  revenue: number
  previousBookings: number
  change: Change
}

export type InsightData = {
  revenue: RevenueInsight
  bookings: BookingsInsight
  "top-doctors": { doctors: TopDoctorRow[] }
  "session-fill": SessionFillInsight
  "booking-behaviour": BookingBehaviourInsight
  leakage: LeakageInsight
  specialities: { specialities: SpecialityRow[] }
}
