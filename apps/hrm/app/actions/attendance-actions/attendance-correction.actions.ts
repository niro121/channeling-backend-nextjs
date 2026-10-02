'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  approveAttendanceCorrections,
  createAttendanceCorrection,
  deleteAttendanceCorrection,
  getAttendanceCorrectionFilterOptions,
  getAttendanceCorrectionFormOptions,
  getAttendanceCorrectionSummary,
  getAttendanceCorrections,
  getAttendanceCorrectionsForExport,
  lookupAttendanceDayForCorrection,
  rejectAttendanceCorrections,
  updateAttendanceCorrection
} from '@/services/attendance-services/attendance-correction.service';
import type {
  AttendanceCorrectionPayload,
  GetAttendanceCorrectionsParams
} from '@/types/attendance';

function listParams(
  params: GetAttendanceCorrectionsParams
): GetAttendanceCorrectionsParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    staffId: params.staffId,
    staffCode: params.staffCode,
    department: params.department,
    designation: params.designation,
    status: params.status,
    attendanceStatus: params.attendanceStatus,
    correctedStatus: params.correctedStatus,
    requestedById: params.requestedById,
    fromDate: params.fromDate,
    toDate: params.toDate,
    code: params.code
  };
}

export async function getAttendanceCorrectionsAction(
  params: GetAttendanceCorrectionsParams
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceCorrections(listParams(params));
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting data. Please try again later'
      );
    }
    return {
      isError: false,
      data: {
        data: result.data?.records ?? [],
        totalRecords: result.data?.totalRecords ?? 0
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getAttendanceCorrectionsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getAttendanceCorrectionSummaryAction() {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceCorrectionSummary();
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting summary. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceCorrectionSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error getting summary. Please try again later'
      }
    };
  }
}

export async function getAttendanceCorrectionFilterOptionsAction() {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceCorrectionFilterOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting filter options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceCorrectionFilterOptionsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ??
          'Error getting filter options. Please try again later'
      }
    };
  }
}

export async function getAttendanceCorrectionFormOptionsAction() {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceCorrectionFormOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting form options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceCorrectionFormOptionsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error getting form options. Please try again later'
      }
    };
  }
}

export async function lookupAttendanceDayForCorrectionAction(
  staffId: string,
  dateIso: string
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await lookupAttendanceDayForCorrection(staffId, dateIso);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Could not load attendance day'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('lookupAttendanceDayForCorrectionAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not load attendance day'
      }
    };
  }
}

export async function createAttendanceCorrectionAction(
  payload: AttendanceCorrectionPayload
) {
  try {
    await requirePermission('attendance', 'add');
    const auditUser = await getAuditUser();
    const result = await createAttendanceCorrection(payload, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not save correction');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-corrections.created',
        entityType: 'AttendanceCorrection',
        entityId: result.data?.id,
        importance: 'medium'
      });
    }

    revalidatePath('/attendance-corrections');
    revalidatePath('/rfid-attendance');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createAttendanceCorrectionAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not save correction' }
    };
  }
}

export async function updateAttendanceCorrectionAction(
  id: string,
  payload: Partial<AttendanceCorrectionPayload>
) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await updateAttendanceCorrection(id, payload, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not update correction');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-corrections.updated',
        entityType: 'AttendanceCorrection',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/attendance-corrections');
    revalidatePath('/rfid-attendance');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateAttendanceCorrectionAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not update correction' }
    };
  }
}

export async function deleteAttendanceCorrectionAction(id: string) {
  try {
    await requirePermission('attendance', 'delete');
    const auditUser = await getAuditUser();
    const result = await deleteAttendanceCorrection(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not delete correction');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-corrections.deleted',
        entityType: 'AttendanceCorrection',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/attendance-corrections');
    return { isError: false, data: { id }, errors: {} };
  } catch (error: any) {
    console.error('deleteAttendanceCorrectionAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not delete correction' }
    };
  }
}

export async function approveAttendanceCorrectionsAction(ids: string[]) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await approveAttendanceCorrections(ids, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not approve corrections');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-corrections.approved',
        entityType: 'AttendanceCorrection',
        importance: 'high',
        metadata: { ids, count: result.data?.count }
      });
    }

    revalidatePath('/attendance-corrections');
    revalidatePath('/rfid-attendance');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('approveAttendanceCorrectionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not approve corrections' }
    };
  }
}

export async function rejectAttendanceCorrectionsAction(ids: string[]) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await rejectAttendanceCorrections(ids, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not reject corrections');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-corrections.rejected',
        entityType: 'AttendanceCorrection',
        importance: 'medium',
        metadata: { ids, count: result.data?.count }
      });
    }

    revalidatePath('/attendance-corrections');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('rejectAttendanceCorrectionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not reject corrections' }
    };
  }
}

export async function getAttendanceCorrectionsExportAction(
  params: GetAttendanceCorrectionsParams
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceCorrectionsForExport(listParams(params));
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'No corrections to export'
      };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('getAttendanceCorrectionsExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export corrections'
    };
  }
}
