'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  activateShiftTypes,
  createShiftType,
  deleteShiftType,
  deleteShiftTypes,
  getShiftTypeById,
  getShiftTypeHistory,
  getShiftTypeSummary,
  getShiftTypes,
  getShiftTypesForExport,
  updateShiftType
} from '@/services/roster-services/shift-type.service';
import type { GetShiftTypesParams, ShiftTypePayload } from '@/types/roster';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).durationHours;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  return payload;
}

function listParams(params: GetShiftTypesParams): GetShiftTypesParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    search: params.search,
    code: params.code,
    name: params.name,
    category: params.category,
    status: params.status,
    nightShift: params.nightShift,
    overnight: params.overnight,
    holidayEligible: params.holidayEligible
  };
}

export async function getShiftTypesAction(params: GetShiftTypesParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftTypes(listParams(params));

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
    console.error('getShiftTypesAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getShiftTypeByIdAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftTypeById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Shift type not found');
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getShiftTypeByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch shift type.' }
    };
  }
}

export async function getShiftTypeSummaryAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftTypeSummary();
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Unable to fetch shift type summary.'
      );
    }
    return {
      isError: false,
      data: result.data ?? {
        total: 0,
        categories: 0,
        active: 0,
        nightOrOvernight: 0,
        holidayEligible: 0
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getShiftTypeSummaryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to fetch shift type summary.'
      }
    };
  }
}

export async function getShiftTypeHistoryAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftTypeHistory(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Unable to fetch shift type history.'
      );
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getShiftTypeHistoryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to fetch shift type history.'
      }
    };
  }
}

export async function createShiftTypeAction(data: ShiftTypePayload) {
  await requirePermission('shift-roster', 'add');
  try {
    const payload = stripAuditFields({ ...data });
    const auditUser = await getAuditUser();
    const result = await createShiftType(payload, auditUser);

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
        action: 'shift.shiftType.created',
        entityType: 'ShiftType',
        entityId: result.data?.id,
        importance: 'high',
        metadata: {
          code: result.data?.code,
          name: result.data?.name
        }
      });
    }

    revalidatePath('/shift-types');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('createShiftTypeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateShiftTypeAction(
  id: string,
  data: Partial<ShiftTypePayload>
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const payload = stripAuditFields({ ...data });
    const auditUser = await getAuditUser();
    const result = await updateShiftType(id, payload, auditUser);

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
        action: 'shift.shiftType.updated',
        entityType: 'ShiftType',
        entityId: id,
        importance: 'high',
        metadata: {
          code: result.data?.code,
          name: result.data?.name
        }
      });
    }

    revalidatePath('/shift-types');
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateShiftTypeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteShiftTypeAction(id: string) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteShiftType(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.shiftType.deleted',
        entityType: 'ShiftType',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/shift-types');
    return {
      isError: false,
      data: {},
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteShiftTypeAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function bulkDeleteShiftTypesAction(ids: string[]) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteShiftTypes(ids);
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error deleting records. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.shiftType.bulkDeleted',
        entityType: 'ShiftType',
        importance: 'high',
        metadata: { count: ids.length }
      });
    }

    revalidatePath('/shift-types');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteShiftTypesAction error:', error);
    throw new Error(
      error.message ?? 'Error deleting records. Please try again later'
    );
  }
}

export async function bulkActivateShiftTypesAction(ids: string[]) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await activateShiftTypes(ids);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ??
            'Error activating records. Please try again later'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.shiftType.activated',
        entityType: 'ShiftType',
        importance: 'high',
        metadata: { count: ids.length }
      });
    }

    revalidatePath('/shift-types');
    return {
      isError: false,
      data: { count: result.data?.count ?? 0 },
      errors: {}
    };
  } catch (error: any) {
    console.error('bulkActivateShiftTypesAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error activating records. Please try again later'
      }
    };
  }
}

export async function getShiftTypesExport(params: GetShiftTypesParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftTypesForExport({
      search: params.search,
      code: params.code,
      name: params.name,
      category: params.category,
      status: params.status,
      nightShift: params.nightShift,
      overnight: params.overnight,
      holidayEligible: params.holidayEligible
    });
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export shift types',
        data: []
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      message: result.message
    };
  } catch (error: any) {
    console.error('getShiftTypesExport error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export shift types',
      data: []
    };
  }
}
