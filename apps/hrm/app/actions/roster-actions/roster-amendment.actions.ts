'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  approveRosterAmendments,
  createRosterAmendment,
  deleteRosterAmendment,
  getRosterAmendmentFilterOptions,
  getRosterAmendmentFormOptions,
  getRosterAmendmentHistory,
  getRosterAmendmentSummary,
  getRosterAmendments,
  getRosterAmendmentsForExport,
  lookupPublishedAllocationForAmendment,
  rejectRosterAmendments,
  updateRosterAmendment
} from '@/services/roster-services/roster-amendment.service';
import type {
  GetRosterAmendmentsParams,
  RosterAmendmentPayload
} from '@/types/roster';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).staffCode;
  delete (payload as any).staffName;
  delete (payload as any).department;
  delete (payload as any).originalShiftLabel;
  delete (payload as any).amendedShiftLabel;
  delete (payload as any).requestedByName;
  delete (payload as any).decidedById;
  delete (payload as any).decidedAt;
  return payload;
}

function listParams(params: GetRosterAmendmentsParams): GetRosterAmendmentsParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    amendmentNo: params.amendmentNo,
    staffSearch: params.staffSearch,
    staffId: params.staffId,
    department: params.department,
    amendmentType: params.amendmentType,
    status: params.status,
    fromDate: params.fromDate,
    toDate: params.toDate,
    requestedById: params.requestedById,
    search: params.search
  };
}

export async function getRosterAmendmentsAction(
  params: GetRosterAmendmentsParams
) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getRosterAmendments(listParams(params));
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
    console.error('getRosterAmendmentsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getRosterAmendmentSummaryAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getRosterAmendmentSummary();
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting summary. Please try again later'
      );
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getRosterAmendmentSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting summary. Please try again later'
      }
    };
  }
}

export async function getRosterAmendmentFilterOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getRosterAmendmentFilterOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting filter options. Please try again later'
      );
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getRosterAmendmentFilterOptionsAction error', error);
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

export async function getRosterAmendmentFormOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getRosterAmendmentFormOptions();
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error getting form options. Please try again later'
      );
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getRosterAmendmentFormOptionsAction error', error);
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

export async function lookupPublishedAllocationForAmendmentAction(
  staffId: string,
  dutyDate: string
) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await lookupPublishedAllocationForAmendment(staffId, dutyDate);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Could not lookup published allocation'
      );
    }
    return {
      isError: false,
      data: result.data ?? null,
      errors: {}
    };
  } catch (error: any) {
    console.error('lookupPublishedAllocationForAmendmentAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not lookup published allocation'
      }
    };
  }
}

export async function createRosterAmendmentAction(payload: RosterAmendmentPayload) {
  await requirePermission('shift-roster', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await createRosterAmendment(
      stripAuditFields(payload) as RosterAmendmentPayload,
      auditUser
    );
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not save amendment',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id && result.data?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.amendment.created',
        entityType: 'RosterAmendment',
        entityId: result.data.id,
        importance: 'high'
      });
    }

    revalidatePath('/roster-amendments');
    revalidatePath('/shift-roster');
    revalidatePath('/duty-roster');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('createRosterAmendmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not save amendment'
      }
    };
  }
}

export async function updateRosterAmendmentAction(
  id: string,
  payload: Partial<RosterAmendmentPayload>
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateRosterAmendment(
      id,
      stripAuditFields(payload) as Partial<RosterAmendmentPayload>,
      auditUser
    );
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Could not update amendment',
          ...(result.error?.issues ?? {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.amendment.updated',
        entityType: 'RosterAmendment',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/roster-amendments');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('updateRosterAmendmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not update amendment'
      }
    };
  }
}

export async function deleteRosterAmendmentAction(id: string) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteRosterAmendment(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.amendment.deleted',
        entityType: 'RosterAmendment',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/roster-amendments');
    return {
      isError: false,
      data: {},
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteRosterAmendmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function approveRosterAmendmentsAction(
  ids: string[],
  remarks?: string | null
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await approveRosterAmendments(ids, auditUser, remarks);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Could not approve selected amendments'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.amendment.approved',
        entityType: 'RosterAmendment',
        importance: 'high',
        metadata: { count: ids.length }
      });
    }

    revalidatePath('/roster-amendments');
    revalidatePath('/shift-roster');
    revalidatePath('/duty-roster');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('approveRosterAmendmentsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not approve selected amendments'
      }
    };
  }
}

export async function rejectRosterAmendmentsAction(
  ids: string[],
  remarks?: string | null
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await rejectRosterAmendments(ids, auditUser, remarks);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Could not reject selected amendments'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.amendment.rejected',
        entityType: 'RosterAmendment',
        importance: 'high',
        metadata: { count: ids.length }
      });
    }

    revalidatePath('/roster-amendments');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('rejectRosterAmendmentsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Could not reject selected amendments'
      }
    };
  }
}

export async function getRosterAmendmentHistoryAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getRosterAmendmentHistory(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting history. Please try again later'
      );
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getRosterAmendmentHistoryAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting history. Please try again later'
      }
    };
  }
}

export async function getRosterAmendmentsExportAction(
  params: GetRosterAmendmentsParams
) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getRosterAmendmentsForExport(listParams(params));
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export amendments'
      };
    }
    return {
      success: true,
      data: result.data ?? []
    };
  } catch (error: any) {
    console.error('getRosterAmendmentsExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export amendments'
    };
  }
}
