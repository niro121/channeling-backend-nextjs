'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { requirePermission } from '@/lib/server-permissions';
import {
  getAttendanceLogDetail,
  getAttendanceLogForExport,
  getAttendanceLogHistory,
  getAttendanceLogRegister
} from '@/services/attendance-services/attendance-log.service';
import type { GetAttendanceLogsParams } from '@/types/attendance';

function listParams(params: GetAttendanceLogsParams): GetAttendanceLogsParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    fromDate: params.fromDate,
    toDate: params.toDate,
    staffSearch: params.staffSearch,
    department: params.department,
    actionType: params.actionType,
    attendanceStatus: params.attendanceStatus,
    source: params.source,
    performedById: params.performedById
  };
}

export async function getAttendanceLogRegisterAction(
  params: GetAttendanceLogsParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceLogRegister(listParams(params));
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load attendance logs'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceLogRegisterAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load attendance logs'
      }
    };
  }
}

export async function getAttendanceLogDetailAction(logId: string) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceLogDetail(logId);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load log detail'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceLogDetailAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load log detail'
      }
    };
  }
}

export async function getAttendanceLogHistoryAction(input: {
  staffId: string;
  attendanceDate: string;
}) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceLogHistory(input);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load log history'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceLogHistoryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load log history'
      }
    };
  }
}

export async function getAttendanceLogExportAction(
  params: GetAttendanceLogsParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceLogForExport(listParams(params));
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.error?.message ?? 'No log rows to export'
      };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('getAttendanceLogExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export attendance logs'
    };
  }
}

export async function logAttendanceLogVisitAction() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'attendance-logs.visited',
        entityType: 'AttendanceDay',
        importance: 'low'
      });
    }
  } catch {
    // non-blocking
  }
}
