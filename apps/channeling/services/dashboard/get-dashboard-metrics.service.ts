import prisma from '@/lib/prisma'
import {
  getColomboMonthRange,
  getColomboSessionDateRange,
} from '@/lib/dashboard-date-range'
import { formatTimeSriLanka, normalizeSessionTime } from '@/lib/utils'
import { getChannelRoomDashboardService } from '@/services/channel-room/get-channel-room-dashboard.service'
import type {
  DashboardKpiCount,
  DashboardQueueSnapshot,
  DashboardRecentBookingRow,
  DashboardRevenueKpi,
} from '@/types/dashboard'

const ACTIVE_BOOKING_STATUSES = [0, 1] as const // unpaid + paid
const PAID_BOOKING_STATUS = 1
const ACTIVE_SESSION_STATUS = 1

function sessionDateFilter(ref: Date = new Date()) {
  const { start, end } = getColomboSessionDateRange(ref)
  return { gte: start, lte: end }
}

/** Today's bookings: unpaid + paid for sessions dated today (Colombo). */
export async function getDashboardTodayBookingsService(): Promise<DashboardKpiCount> {
  const count = await prisma.booking.count({
    where: {
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      session: { date: sessionDateFilter() },
    },
  })
  return { value: count }
}

/**
 * Today's revenue: nett collected from paid bookings for today's sessions
 * (amount − refundAmount).
 */
export async function getDashboardTodayRevenueService(): Promise<DashboardRevenueKpi> {
  const rows = await prisma.booking.findMany({
    where: {
      status: PAID_BOOKING_STATUS,
      session: { date: sessionDateFilter() },
    },
    select: { amount: true, refundAmount: true },
  })
  const value = rows.reduce((sum, row) => {
    const amount = Number(row.amount ?? 0)
    const refund = Number(row.refundAmount ?? 0)
    return sum + Math.max(0, amount - refund)
  }, 0)
  return { value }
}

/** Active consultant sessions with date = today (Colombo). */
export async function getDashboardSessionsTodayService(): Promise<DashboardKpiCount> {
  const count = await prisma.session.count({
    where: {
      status: ACTIVE_SESSION_STATUS,
      date: sessionDateFilter(),
    },
  })
  return { value: count }
}

/** Patients created in the current Colombo calendar month. */
export async function getDashboardNewPatientsService(): Promise<DashboardKpiCount> {
  const { start, end } = getColomboMonthRange()
  const count = await prisma.patient.count({
    where: { createdAt: { gte: start, lte: end } },
  })
  return { value: count }
}

/** Latest bookings for today's sessions. */
export async function getDashboardRecentBookingsService(
  take = 10
): Promise<DashboardRecentBookingRow[]> {
  const rows = await prisma.booking.findMany({
    where: {
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      session: { date: sessionDateFilter() },
    },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      title: true,
      name: true,
      amount: true,
      doctor: { select: { title: true, name: true } },
      session: { select: { date: true, startTime: true } },
    },
  })

  return rows.map((row) => {
    const patientName = [row.title, row.name].filter(Boolean).join(' ').trim() || '—'
    const consultantName =
      [row.doctor?.title, row.doctor?.name].filter(Boolean).join(' ').trim() || '—'

    let time = '—'
    if (row.session?.startTime != null && row.session.date != null) {
      const sessionDate =
        row.session.date instanceof Date
          ? row.session.date
          : new Date(row.session.date)
      const start = normalizeSessionTime(
        row.session.startTime as Date | number,
        sessionDate
      )
      time = formatTimeSriLanka(start).replace('.', ':')
    }

    return {
      id: row.id,
      time,
      patientName,
      consultantName,
      fee: Number(row.amount ?? 0),
    }
  })
}

/** Aggregate live queue from channel-room occupancy for today. */
export async function getDashboardQueueSnapshotService(): Promise<DashboardQueueSnapshot> {
  const result = await getChannelRoomDashboardService({})
  if (!result.success || !result.data) {
    return { activeRooms: 0, waiting: 0, shown: 0, noShow: 0 }
  }

  return result.data.reduce(
    (acc, row) => {
      acc.activeRooms += 1
      acc.waiting += row.waitingCount
      acc.shown += row.shownCount
      acc.noShow += row.noShowCount
      return acc
    },
    { activeRooms: 0, waiting: 0, shown: 0, noShow: 0 }
  )
}
