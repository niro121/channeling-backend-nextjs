'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  deleteDutyAllocation,
  getDutyRoster,
  getDutyRosterFilterOptions,
  getDutyRosterForExport,
  getDutyRosterFormOptions,
  getDutyRosterHistory,
  replaceDutyStaff,
  saveDutyAllocation,
  swapDutyAllocations,
  updateDutyAttendance
} from '@/services/roster-services/duty-roster.service';
import type {
  GetDutyRosterParams,
  ReplaceDutyPayload,
  SaveRosterAllocationDraftPayload,
  SwapDutyPayload,
  UpdateDutyAttendancePayload
} from '@/types/roster';

function listParams(params: GetDutyRosterParams): GetDutyRosterParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    department: params.department,
    unit: params.unit,
    roster: params.roster,
    shiftTypeId: params.shiftTypeId,
    dutyDate: params.dutyDate,
    view: params.view,
    search: params.search
  };
}

function revalidateDutyPaths() {
  revalidatePath('/duty-roster');
  revalidatePath('/shift-roster');
}

export async function getDutyRosterAction(params: GetDutyRosterParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getDutyRoster(listParams(params));
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
    console.error('getDutyRosterAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getDutyRosterFilterOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getDutyRosterFilterOptions();
    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message ?? 'Failed to load duty roster filters'
      );
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getDutyRosterFilterOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load duty roster filters'
      }
    };
  }
}

export async function getDutyRosterFormOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getDutyRosterFormOptions();
    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message ?? 'Failed to load duty roster form options'
      );
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getDutyRosterFormOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load duty roster form options'
      }
    };
  }
}

export async function getDutyRosterHistoryAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getDutyRosterHistory(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Unable to fetch duty roster history.'
      );
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getDutyRosterHistoryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to fetch duty roster history.'
      }
    };
  }
}

export async function getDutyRosterExport(params: GetDutyRosterParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getDutyRosterForExport(listParams(params));
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export duty roster'
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      message: result.message
    };
  } catch (error: any) {
    console.error('getDutyRosterExport error:', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export duty roster'
    };
  }
}

export async function saveDutyAllocationAction(
  data: SaveRosterAllocationDraftPayload
) {
  await requirePermission(
    'shift-roster',
    data.allocationId ? 'edit' : 'add'
  );
  try {
    const auditUser = await getAuditUser();
    const result = await saveDutyAllocation(data, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: data.allocationId
          ? 'duty.roster.updated'
          : 'duty.roster.assigned',
        entityType: 'RosterAllocation',
        entityId: result.data?.id,
        importance: 'high',
        metadata: { staffId: data.staffId }
      });
    }

    revalidateDutyPaths();
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('saveDutyAllocationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function swapDutyAllocationsAction(data: SwapDutyPayload) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await swapDutyAllocations(data, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'duty.roster.swapped',
        entityType: 'RosterAllocation',
        entityId: data.allocationId,
        importance: 'high',
        metadata: {
          staffId: data.staffId,
          otherStaffId: data.otherStaffId
        }
      });
    }

    revalidateDutyPaths();
    return {
      isError: false,
      data: { saved: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('swapDutyAllocationsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function replaceDutyStaffAction(data: ReplaceDutyPayload) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await replaceDutyStaff(data, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'duty.roster.replaced',
        entityType: 'RosterAllocation',
        entityId: data.allocationId,
        importance: 'high',
        metadata: {
          staffId: data.staffId,
          replacementStaffId: data.replacementStaffId
        }
      });
    }

    revalidateDutyPaths();
    return {
      isError: false,
      data: { saved: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('replaceDutyStaffAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateDutyAttendanceAction(
  data: UpdateDutyAttendancePayload
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateDutyAttendance(data, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'duty.roster.attendanceUpdated',
        entityType: 'RosterAllocation',
        entityId: data.allocationId,
        importance: 'medium',
        metadata: { attendance: data.attendance }
      });
    }

    revalidateDutyPaths();
    return {
      isError: false,
      data: { saved: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateDutyAttendanceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteDutyAllocationAction(id: string) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteDutyAllocation(id, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors: {
          message:
            result.error?.message ??
            'Something went wrong. Please try again later'
        },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'duty.roster.deleted',
        entityType: 'RosterAllocation',
        entityId: id,
        importance: 'high'
      });
    }

    revalidateDutyPaths();
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteDutyAllocationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
