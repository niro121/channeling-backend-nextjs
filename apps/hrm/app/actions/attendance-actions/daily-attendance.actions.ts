'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { requirePermission } from '@/lib/server-permissions';
import {
  getDailyAttendanceForExport,
  getDailyAttendanceRegister
} from '@/services/attendance-services/daily-attendance.service';
import type { GetDailyAttendanceParams } from '@/types/attendance';

function listParams(
  params: GetDailyAttendanceParams
): GetDailyAttendanceParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    date: params.date,
    institution: params.institution,
    department: params.department,
    room: params.room,
    staffCategory: params.staffCategory,
    designation: params.designation,
    staffId: params.staffId,
    shiftTypeId: params.shiftTypeId,
    status: params.status
  };
}

export async function getDailyAttendanceRegisterAction(
  params: GetDailyAttendanceParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getDailyAttendanceRegister(listParams(params));
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load daily attendance'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getDailyAttendanceRegisterAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load daily attendance'
      }
    };
  }
}

export async function getDailyAttendanceExportAction(
  params: GetDailyAttendanceParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getDailyAttendanceForExport(listParams(params));
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.error?.message ?? 'No attendance rows to export'
      };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('getDailyAttendanceExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export daily attendance'
    };
  }
}

export async function logDailyAttendanceVisitAction() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'attendance-daily.visited',
        entityType: 'AttendanceDay',
        importance: 'low'
      });
    }
  } catch {
    // non-blocking
  }
}
