'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { requirePermission } from '@/lib/server-permissions';
import {
  getAttendanceSummaryDetail,
  getAttendanceSummaryForExport,
  getAttendanceSummaryRegister
} from '@/services/attendance-services/attendance-summary.service';
import type { GetAttendanceSummaryParams } from '@/types/attendance';

function listParams(
  params: GetAttendanceSummaryParams
): GetAttendanceSummaryParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    fromDate: params.fromDate,
    toDate: params.toDate,
    institution: params.institution,
    department: params.department,
    room: params.room,
    staffCategory: params.staffCategory,
    designation: params.designation,
    staffId: params.staffId,
    shiftTypeId: params.shiftTypeId
  };
}

export async function getAttendanceSummaryRegisterAction(
  params: GetAttendanceSummaryParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceSummaryRegister(listParams(params));
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load attendance summary'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceSummaryRegisterAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load attendance summary'
      }
    };
  }
}

export async function getAttendanceSummaryDetailAction(input: {
  staffId: string;
  fromDate?: string;
  toDate?: string;
}) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceSummaryDetail(input);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to load staff summary detail'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceSummaryDetailAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load staff summary detail'
      }
    };
  }
}

export async function getAttendanceSummaryExportAction(
  params: GetAttendanceSummaryParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceSummaryForExport(listParams(params));
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.error?.message ?? 'No summary rows to export'
      };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('getAttendanceSummaryExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export attendance summary'
    };
  }
}

export async function logAttendanceSummaryVisitAction() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'attendance-summary.visited',
        entityType: 'AttendanceDay',
        importance: 'low'
      });
    }
  } catch {
    // non-blocking
  }
}
