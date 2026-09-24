'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  DASHBOARD_MODULES,
  DASHBOARD_RESOURCE,
  type DashboardModuleAction,
} from '@/lib/dashboard-permissions'
import { requirePermission } from '@/lib/server-permissions'
import { getCurrentShift } from '@/services/shift.service'
import {
  getDashboardNewPatientsService,
  getDashboardQueueSnapshotService,
  getDashboardRecentBookingsService,
  getDashboardSessionsTodayService,
  getDashboardTodayBookingsService,
  getDashboardTodayRevenueService,
} from '@/services/dashboard/get-dashboard-metrics.service'
import type {
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

export async function getDashboardNewPatientsAction(): Promise<DashboardKpiCount> {
  await requireDashboardModule(DASHBOARD_MODULES.newPatients)
  return getDashboardNewPatientsService()
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
