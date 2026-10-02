'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { requirePermission } from '@/lib/server-permissions';
import {
  getRfidAttendanceDashboard,
  getRfidAttendancePunchesForExport
} from '@/services/attendance-services/rfid-attendance.service';
import type { RfidAttendanceFilters } from '@/types/attendance';

export async function getRfidAttendanceDashboardAction(
  filters: RfidAttendanceFilters = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getRfidAttendanceDashboard(filters);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load RFID attendance'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getRfidAttendanceDashboardAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load RFID attendance'
      }
    };
  }
}

export async function getRfidAttendanceExportAction(
  filters: RfidAttendanceFilters = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getRfidAttendancePunchesForExport(filters);
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.error?.message ?? 'No punches to export'
      };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('getRfidAttendanceExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export punches'
    };
  }
}

export async function logRfidAttendanceVisitAction() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'rfid-attendance.visited',
        entityType: 'AttendanceDay',
        importance: 'low'
      });
    }
  } catch {
    // non-blocking
  }
}
