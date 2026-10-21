'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createPublicHolidayShift,
  deletePublicHolidayShift,
  getPublicHolidayShiftFilterOptions,
  getPublicHolidayShiftFormOptions,
  getPublicHolidayShiftHistory,
  getPublicHolidayShifts,
  getPublicHolidayShiftsForExport,
  getPublicHolidayShiftSummary,
  updatePublicHolidayShift
} from '@/services/roster-services/public-holiday-shift.service';
import type {
  GetPublicHolidayShiftsParams,
  PublicHolidayShiftPayload
} from '@/types/roster';

function listParams(
  params: GetPublicHolidayShiftsParams
): GetPublicHolidayShiftsParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    holidayId: params.holidayId,
    holidayTypeId: params.holidayTypeId,
    fromDate: params.fromDate,
    toDate: params.toDate,
    department: params.department,
    unit: params.unit,
    payRate: params.payRate,
    status: params.status,
    search: params.search
  };
}

function revalidateHolidayPaths() {
  revalidatePath('/public-holiday-shifts');
  revalidatePath('/shift-roster');
  revalidatePath('/duty-roster');
}

export async function getPublicHolidayShiftsAction(
  params: GetPublicHolidayShiftsParams
) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getPublicHolidayShifts(listParams(params));
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting data. Please try again later'
      );
    }
    return {
      isError: false,
      data: {
        data: result.data?.records ?? [],
        totalRecords: result.data?.totalRecords ?? 0,
        summary: result.data?.summary
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getPublicHolidayShiftsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getPublicHolidayShiftSummaryAction(
  params: GetPublicHolidayShiftsParams
) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getPublicHolidayShiftSummary(listParams(params));
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting summary. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPublicHolidayShiftSummaryAction error', error);
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

export async function getPublicHolidayShiftFilterOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getPublicHolidayShiftFilterOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting filter options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPublicHolidayShiftFilterOptionsAction error', error);
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

export async function getPublicHolidayShiftFormOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getPublicHolidayShiftFormOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting form options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getPublicHolidayShiftFormOptionsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ??
          'Error getting form options. Please try again later'
      }
    };
  }
}

export async function createPublicHolidayShiftAction(
  payload: PublicHolidayShiftPayload
) {
  await requirePermission('shift-roster', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await createPublicHolidayShift(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not save holiday shift',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id && result.data?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.holiday.created',
        entityType: 'RosterAllocation',
        entityId: result.data.id,
        importance: 'high',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode
        }
      });
    }

    revalidateHolidayPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createPublicHolidayShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not save holiday shift' }
    };
  }
}

export async function updatePublicHolidayShiftAction(
  id: string,
  payload: PublicHolidayShiftPayload
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updatePublicHolidayShift(id, payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not update holiday shift',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.holiday.updated',
        entityType: 'RosterAllocation',
        entityId: id,
        importance: 'high',
        metadata: {
          staffName: result.data?.staffName,
          staffCode: result.data?.staffCode
        }
      });
    }

    revalidateHolidayPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updatePublicHolidayShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not update holiday shift' }
    };
  }
}

export async function deletePublicHolidayShiftAction(id: string) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deletePublicHolidayShift(id, auditUser);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.holiday.deleted',
        entityType: 'RosterAllocation',
        entityId: id,
        importance: 'high'
      });
    }

    revalidateHolidayPaths();
    return { isError: false, data: {}, errors: {} };
  } catch (error: any) {
    console.error('deletePublicHolidayShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function getPublicHolidayShiftHistoryAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getPublicHolidayShiftHistory(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting history. Please try again later'
      );
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getPublicHolidayShiftHistoryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error getting history. Please try again later'
      }
    };
  }
}

export async function getPublicHolidayShiftsExportAction(
  params: GetPublicHolidayShiftsParams
) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getPublicHolidayShiftsForExport(listParams(params));
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export holiday shifts'
      };
    }
    return { success: true, data: result.data ?? [] };
  } catch (error: any) {
    console.error('getPublicHolidayShiftsExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export holiday shifts'
    };
  }
}
