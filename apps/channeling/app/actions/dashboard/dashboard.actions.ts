'use server'

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

export async function getDashboardTodayBookingsAction(): Promise<DashboardKpiCount> {
  return getDashboardTodayBookingsService()
}

export async function getDashboardTodayRevenueAction(): Promise<DashboardRevenueKpi> {
  return getDashboardTodayRevenueService()
}

export async function getDashboardSessionsTodayAction(): Promise<DashboardKpiCount> {
  return getDashboardSessionsTodayService()
}

export async function getDashboardNewPatientsAction(): Promise<DashboardKpiCount> {
  return getDashboardNewPatientsService()
}

export async function getDashboardRecentBookingsAction(): Promise<
  DashboardRecentBookingRow[]
> {
  return getDashboardRecentBookingsService(10)
}

export async function getDashboardQueueSnapshotAction(): Promise<DashboardQueueSnapshot> {
  return getDashboardQueueSnapshotService()
}
