'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createOvernightShift,
  deleteOvernightShift,
  getOvernightShiftFilterOptions,
  getOvernightShiftFormOptions,
  getOvernightShiftHistory,
  getOvernightShifts,
  getOvernightShiftsForExport,
  recalculateOvernightSplits,
  updateOvernightShift
} from '@/services/roster-services/overnight-shift.service';
import type { GetOvernightShiftsParams, OvernightShiftPayload } from '@/types/roster';

function listParams(params: GetOvernightShiftsParams): GetOvernightShiftsParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    fromDate: params.fromDate,
    toDate: params.toDate,
    department: params.department,
    unit: params.unit,
    shiftTypeId: params.shiftTypeId,
    allocationDate: params.allocationDate,
    staffSearch: params.staffSearch,
    status: params.status,
    search: params.search
  };
}

function revalidateOvernightPaths() {
  revalidatePath('/overnight-shifts');
  revalidatePath('/shift-roster');
  revalidatePath('/duty-roster');
}

export async function getOvernightShiftsAction(params: GetOvernightShiftsParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getOvernightShifts(listParams(params));
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
    console.error('getOvernightShiftsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getOvernightShiftFilterOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getOvernightShiftFilterOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting filter options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getOvernightShiftFilterOptionsAction error', error);
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

export async function getOvernightShiftFormOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getOvernightShiftFormOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting form options. Please try again later'
      );
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getOvernightShiftFormOptionsAction error', error);
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

export async function createOvernightShiftAction(payload: OvernightShiftPayload) {
  await requirePermission('shift-roster', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await createOvernightShift(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not save overnight shift',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id && result.data?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.overnight.created',
        entityType: 'RosterAllocation',
        entityId: result.data.id,
        importance: 'high',
        metadata: {
          staffName: result.data.staffName,
          staffCode: result.data.staffCode
        }
      });
    }

    revalidateOvernightPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createOvernightShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not save overnight shift' }
    };
  }
}

export async function updateOvernightShiftAction(
  id: string,
  payload: OvernightShiftPayload
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateOvernightShift(id, payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not update overnight shift',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.overnight.updated',
        entityType: 'RosterAllocation',
        entityId: id,
        importance: 'high',
        metadata: {
          staffName: result.data?.staffName,
          staffCode: result.data?.staffCode
        }
      });
    }

    revalidateOvernightPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateOvernightShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not update overnight shift' }
    };
  }
}

export async function deleteOvernightShiftAction(id: string) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteOvernightShift(id, auditUser);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.overnight.deleted',
        entityType: 'RosterAllocation',
        entityId: id,
        importance: 'high'
      });
    }

    revalidateOvernightPaths();
    return { isError: false, data: {}, errors: {} };
  } catch (error: any) {
    console.error('deleteOvernightShiftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function getOvernightShiftHistoryAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getOvernightShiftHistory(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting history. Please try again later'
      );
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getOvernightShiftHistoryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting history. Please try again later'
      }
    };
  }
}

export async function getOvernightShiftsExportAction(params: GetOvernightShiftsParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getOvernightShiftsForExport(listParams(params));
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export overnight shifts'
      };
    }
    return { success: true, data: result.data ?? [] };
  } catch (error: any) {
    console.error('getOvernightShiftsExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export overnight shifts'
    };
  }
}

export async function recalculateOvernightSplitsAction() {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await recalculateOvernightSplits(auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to recalculate splits'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.overnight.recalculate',
        entityType: 'RosterAllocation',
        importance: 'medium'
      });
    }

    revalidateOvernightPaths();
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('recalculateOvernightSplitsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to recalculate splits' }
    };
  }
}
