import prisma from '@/lib/prisma'
import { getColomboSessionDateRange } from '@/lib/dashboard-date-range'
import { formatTimeSriLanka, normalizeSessionTime } from '@/lib/utils'
import { getChannelRoomDashboardService } from '@/services/channel-room/get-channel-room-dashboard.service'
import { getApprovalAccess } from '@/services/approval-request.service'
import type { Permissions } from '@/types/user-group'
import {
  APPROVAL_REQUEST_STATUS,
  APPROVAL_REQUEST_TYPE,
  OPEN_APPROVAL_STATUSES,
} from '@/types/approval-request'
import { FLOAT_REQUEST_STATUS } from '@/types/float-request'
import type {
  DashboardApprovalStats,
  DashboardFloatStats,
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
 * Today's revenue: nett collected from paid bookings for today's sessions.
 * Refund receipts store booking.refundAmount as a negative outflow (legacy rows
 * may be positive), so the refund is always taken as a magnitude and subtracted.
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
    const refund = Math.abs(Number(row.refundAmount ?? 0))
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

const EMPTY_APPROVAL_STATS: DashboardApprovalStats = {
  toAttend: 0,
  mineOpen: 0,
  cancels: 0,
  refunds: 0,
  deposits: 0,
}

/**
 * Approval center counts for this user: pending items they can attend
 * (not their own), split by type, plus their own still-open requests.
 */
export async function getDashboardApprovalStatsService(input: {
  userId: string
  permissions: Permissions | null | undefined
  isAdmin: boolean
}): Promise<DashboardApprovalStats> {
  const access = getApprovalAccess(input.permissions, input.isAdmin)
  if (!access.canOpen) return EMPTY_APPROVAL_STATS

  const attendTypes: string[] = []
  if (access.canSeeCancels) attendTypes.push(APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL)
  if (access.canSeeRefunds) attendTypes.push(APPROVAL_REQUEST_TYPE.CHANNEL_REFUND)
  if (access.canSeeDeposits) attendTypes.push(APPROVAL_REQUEST_TYPE.BANK_DEPOSIT)

  const attendBase = {
    status: APPROVAL_REQUEST_STATUS.PENDING,
    requestedById: { not: input.userId },
    type: { in: attendTypes },
  }

  const [toAttend, cancels, refunds, deposits, mineOpen] = await Promise.all([
    access.canAttend && attendTypes.length > 0
      ? prisma.approvalRequest.count({ where: attendBase })
      : Promise.resolve(0),
    access.canSeeCancels
      ? prisma.approvalRequest.count({
          where: { ...attendBase, type: APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL },
        })
      : Promise.resolve(0),
    access.canSeeRefunds
      ? prisma.approvalRequest.count({
          where: { ...attendBase, type: APPROVAL_REQUEST_TYPE.CHANNEL_REFUND },
        })
      : Promise.resolve(0),
    access.canSeeDeposits
      ? prisma.approvalRequest.count({
          where: { ...attendBase, type: APPROVAL_REQUEST_TYPE.BANK_DEPOSIT },
        })
      : Promise.resolve(0),
    access.canSeeMine
      ? prisma.approvalRequest.count({
          where: {
            requestedById: input.userId,
            status: { in: [...OPEN_APPROVAL_STATUSES] },
          },
        })
      : Promise.resolve(0),
  ])

  return { toAttend, mineOpen, cancels, refunds, deposits }
}

/**
 * Float requests this user must act on: pending ones assigned to them as
 * bulk cashier, and approved ones they still need to receive.
 */
export async function getDashboardFloatStatsService(
  userId: string
): Promise<DashboardFloatStats> {
  const [toApprove, toReceive] = await Promise.all([
    prisma.floatRequest.count({
      where: { bulkCashierId: userId, status: FLOAT_REQUEST_STATUS.PENDING },
    }),
    prisma.floatRequest.count({
      where: { requestedById: userId, status: FLOAT_REQUEST_STATUS.APPROVED },
    }),
  ])
  return { toApprove, toReceive }
}
