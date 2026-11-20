'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  bulkCreatePublicHolidayShifts,
  createPublicHolidayShift,
  deletePublicHolidayShift,
  getPublicHolidayShiftConflictPreview,
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
  PublicHolidayBulkShiftPayload,
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

/** Preview Lieu bank period/balance when Grant Lieu Leave is enabled. */
export async function getLieuGrantPreviewAction(input: {
  staffId: string;
  dutyDate: Date | string | null;
  allocationId?: string | null;
}) {
  try {
    await requirePermission('shift-roster', 'view');
    if (!input.staffId?.trim() || !input.dutyDate) {
      return { isError: false, data: null, errors: {} };
    }
    const { getLieuGrantPreview } = await import(
      '@/services/leave-services/lieu-leave-grant.service'
    );
    const result = await getLieuGrantPreview({
      staffId: input.staffId,
      dutyDate: input.dutyDate,
      allocationId: input.allocationId
    });
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not load Lieu grant preview'
        }
      };
    }
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('getLieuGrantPreviewAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not load Lieu grant preview'
      }
    };
  }
}

export async function getPublicHolidayShiftConflictPreviewAction(input: {
  staffId: string;
  dutyDate: Date | string | null;
  shiftTypeId?: string | null;
  excludeAllocationId?: string | null;
}) {
  try {
    await requirePermission('shift-roster', 'view');
    if (!input.staffId?.trim() || !input.dutyDate) {
      return { isError: false, data: null, errors: {} };
    }
    const result = await getPublicHolidayShiftConflictPreview({
      staffId: input.staffId,
      dutyDate: input.dutyDate,
      shiftTypeId: input.shiftTypeId,
      excludeAllocationId: input.excludeAllocationId
    });
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not check conflicts'
        }
      };
    }
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('getPublicHolidayShiftConflictPreviewAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not check conflicts'
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
          ...(result.error?.issues ?? {}),
          ...(result.error?.softWarnings
            ? { softWarnings: result.error.softWarnings }
            : {}),
          ...(result.error?.requiresAck ? { requiresAck: true } : {})
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

export async function bulkCreatePublicHolidayShiftsAction(
  payload: PublicHolidayBulkShiftPayload
) {
  await requirePermission('shift-roster', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await bulkCreatePublicHolidayShifts(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: result.data ?? null,
        errors: {
          message:
            result.error?.message ?? 'Could not bulk create holiday shifts',
          ...(result.error?.issues ?? {}),
          ...(result.error?.softWarnings
            ? { softWarnings: result.error.softWarnings }
            : {}),
          ...(result.error?.requiresAck ? { requiresAck: true } : {})
        }
      };
    }

    if (auditUser?.id && result.data?.ids?.length) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.holiday.bulkCreated',
        entityType: 'RosterAllocation',
        importance: 'high',
        metadata: {
          count: result.data.count,
          skipped: result.data.skipped.length
        }
      });
    }

    revalidateHolidayPaths();
    return {
      isError: false,
      data: result.data,
      errors: {},
      message: result.message
    };
  } catch (error: any) {
    console.error('bulkCreatePublicHolidayShiftsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not bulk create holiday shifts'
      }
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
          ...(result.error?.issues ?? {}),
          ...(result.error?.softWarnings
            ? { softWarnings: result.error.softWarnings }
            : {}),
          ...(result.error?.requiresAck ? { requiresAck: true } : {})
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

export async function getPublicHolidayShiftsExport(
  params: GetPublicHolidayShiftsParams
) {
  await requirePermission('shift-roster', 'view');

  try {
    const response = await getPublicHolidayShiftsForExport({
      holidayId: params.holidayId,
      holidayTypeId: params.holidayTypeId,
      fromDate: params.fromDate,
      toDate: params.toDate,
      department: params.department,
      unit: params.unit,
      payRate: params.payRate,
      status: params.status,
      search: params.search
    });

    if (!response.data?.length) {
      return {
        success: false,
        message: 'No holiday shifts found',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: unknown) {
    console.error('getPublicHolidayShiftsExport error', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Error getting data. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
}
