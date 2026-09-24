'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  DASHBOARD_MODULES,
  DASHBOARD_RESOURCE,
  type DashboardModuleAction,
} from '@/lib/dashboard-permissions'
import { checkRouteAccess, requirePermission } from '@/lib/server-permissions'
import { userTypes } from '@/lib/roles'
import { getCurrentShift } from '@/services/shift.service'
import {
  getDashboardApprovalStatsService,
  getDashboardFloatStatsService,
  getDashboardQueueSnapshotService,
  getDashboardRecentBookingsService,
  getDashboardSessionsTodayService,
  getDashboardTodayBookingsService,
  getDashboardTodayRevenueService,
} from '@/services/dashboard/get-dashboard-metrics.service'
import type {
  DashboardApprovalStats,
  DashboardFloatStats,
  DashboardKpiCount,
  DashboardQueueSnapshot,
  DashboardRecentBookingRow,
  DashboardRevenueKpi,
} from '@/types/dashboard'

async function requireDashboardModule(action: DashboardModuleAction): Promise<void> {
  await requirePermission(DASHBOARD_RESOURCE, action)
}

export async function getDashboardShiftStatusAction() {
  await requireDashboardModule(DASHBOARD_MODULES.shiftStatus)
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return getCurrentShift(session.user.id)
}

export async function getDashboardTodayBookingsAction(): Promise<DashboardKpiCount> {
  await requireDashboardModule(DASHBOARD_MODULES.todayBookings)
  return getDashboardTodayBookingsService()
}

export async function getDashboardTodayRevenueAction(): Promise<DashboardRevenueKpi> {
  await requireDashboardModule(DASHBOARD_MODULES.todayRevenue)
  return getDashboardTodayRevenueService()
}

export async function getDashboardSessionsTodayAction(): Promise<DashboardKpiCount> {
  await requireDashboardModule(DASHBOARD_MODULES.sessionsToday)
  return getDashboardSessionsTodayService()
}

const EMPTY_APPROVAL_STATS: DashboardApprovalStats = {
  toAttend: 0,
  mineOpen: 0,
  cancels: 0,
  refunds: 0,
  deposits: 0,
}

export async function getDashboardApprovalStatsAction(): Promise<DashboardApprovalStats> {
  const allowed = await checkRouteAccess('/approvals')
  const session = await getServerSession(authOptions)
  if (!allowed || !session?.user?.id) return EMPTY_APPROVAL_STATS
  return getDashboardApprovalStatsService({
    userId: session.user.id,
    permissions: session.user.permissions,
    isAdmin: session.user.userType === userTypes.admin,
  })
}

const EMPTY_FLOAT_STATS: DashboardFloatStats = { toApprove: 0, toReceive: 0 }

export async function getDashboardFloatStatsAction(): Promise<DashboardFloatStats> {
  const [bulk, transfers] = await Promise.all([
    checkRouteAccess('/bulk-cashier'),
    checkRouteAccess('/float-transfers'),
  ])
  const session = await getServerSession(authOptions)
  if ((!bulk && !transfers) || !session?.user?.id) return EMPTY_FLOAT_STATS
  return getDashboardFloatStatsService(session.user.id)
}

export async function getDashboardRecentBookingsAction(): Promise<
  DashboardRecentBookingRow[]
> {
  await requireDashboardModule(DASHBOARD_MODULES.recentBookings)
  return getDashboardRecentBookingsService(10)
}

export async function getDashboardQueueSnapshotAction(): Promise<DashboardQueueSnapshot> {
  await requireDashboardModule(DASHBOARD_MODULES.queueSnapshot)
  return getDashboardQueueSnapshotService()
}
