'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createNightShift,
  deleteNightShift,
  getNightShiftFilterOptions,
  getNightShiftFormOptions,
  getNightShiftHistory,
  getNightShifts,
  getNightShiftsForExport,
  getNightShiftSummary,
  updateNightShift
} from '@/services/roster-services/night-shift.service';
import type { GetNightShiftsParams, NightShiftPayload } from '@/types/roster';

function listParams(params: GetNightShiftsParams): GetNightShiftsParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    fromDate: params.fromDate,
    toDate: params.toDate,
    department: params.department,
    unit: params.unit,
    shiftTypeId: params.shiftTypeId,
    staffSearch: params.staffSearch,
    status: params.status,
    search: params.search
  };
}

function revalidateNightPaths() {
  revalidatePath('/night-shifts');
  revalidatePath('/shift-roster');
  revalidatePath('/duty-roster');
}

export async function getNightShiftsAction(params: GetNightShiftsParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getNightShifts(listParams(params));
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
    console.error('getNightShiftsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getNightShiftSummaryAction(params: GetNightShiftsParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getNightShiftSummary(listParams(params));
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting summary. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getNightShiftSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting summary. Please try again later'
      }
    };
  }
}

export async function getNightShiftFilterOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getNightShiftFilterOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting filter options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getNightShiftFilterOptionsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error getting filter options. Please try again later'
      }
    };
  }
}

export async function getNightShiftFormOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getNightShiftFormOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting form options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getNightShiftFormOptionsAction error', error);
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

export async function createNightShiftAction(payload: NightShiftPayload) {
  await requirePermission('shift-roster', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await createNightShift(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not save night shift',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id && result.data?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.night.created',
        entityType: 'RosterAllocation',
        entityId: result.data.id,
        importance: 'high',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode
        }
      });
    }

    revalidateNightPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createNightShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not save night shift' }
    };
  }
}

export async function updateNightShiftAction(
  id: string,
  payload: NightShiftPayload
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateNightShift(id, payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not update night shift',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.night.updated',
        entityType: 'RosterAllocation',
        entityId: id,
        importance: 'high',
        metadata: {
          staffName: result.data?.staffName,
          staffCode: result.data?.staffCode
        }
      });
    }

    revalidateNightPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateNightShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not update night shift' }
    };
  }
}

export async function deleteNightShiftAction(id: string) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteNightShift(id, auditUser);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.night.deleted',
        entityType: 'RosterAllocation',
        entityId: id,
        importance: 'high'
      });
    }

    revalidateNightPaths();
    return { isError: false, data: {}, errors: {} };
  } catch (error: any) {
    console.error('deleteNightShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function getNightShiftHistoryAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getNightShiftHistory(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting history. Please try again later'
      );
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getNightShiftHistoryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting history. Please try again later'
      }
    };
  }
}

export async function getNightShiftsExportAction(params: GetNightShiftsParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getNightShiftsForExport(listParams(params));
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export night shifts'
      };
    }
    return { success: true, data: result.data ?? [] };
  } catch (error: any) {
    console.error('getNightShiftsExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export night shifts'
    };
  }
}
