'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getStaffOptions } from '@/services/staff-services/staff.service';
import { getActiveShiftTypeOptions } from '@/services/roster-services/shift-type.service';
import {
  bulkCreateShiftAssignments,
  createShiftAssignment,
  deleteShiftAssignment,
  deleteShiftAssignments,
  getShiftAssignmentById,
  getShiftAssignmentFilterOptions,
  getShiftAssignmentHistory,
  getShiftAssignmentSummary,
  getShiftAssignments,
  getShiftAssignmentsForExport,
  updateShiftAssignment
} from '@/services/roster-services/shift-assignment.service';
import type {
  GetShiftAssignmentsParams,
  ShiftAssignmentPayload
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
  delete (payload as any).unit;
  delete (payload as any).designation;
  delete (payload as any).shiftTypeName;
  return payload;
}

function listParams(params: GetShiftAssignmentsParams): GetShiftAssignmentsParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    staffId: params.staffId,
    shiftTypeId: params.shiftTypeId,
    institution: params.institution,
    department: params.department,
    unit: params.unit,
    designation: params.designation,
    staffCategory: params.staffCategory,
    staffGrade: params.staffGrade,
    employeeStatus: params.employeeStatus,
    status: params.status,
    search: params.search
  };
}

export async function getShiftAssignmentsAction(params: GetShiftAssignmentsParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftAssignments(listParams(params));
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
    console.error('getShiftAssignmentsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getShiftAssignmentFormOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const [staffRes, shiftTypeRes] = await Promise.all([
      getStaffOptions(),
      getActiveShiftTypeOptions()
    ]);

    if (!staffRes.success) {
      throw new Error(staffRes.error?.message ?? 'Failed to load staff options');
    }
    if (!shiftTypeRes.success) {
      throw new Error(
        shiftTypeRes.error?.message ?? 'Failed to load shift type options'
      );
    }

    return {
      isError: false,
      data: {
        staff: (staffRes.data ?? []).map((staff) => ({
          id: staff.id,
          name: staff.code ? `${staff.code} — ${staff.name}` : staff.name
        })),
        shiftTypes: (shiftTypeRes.data ?? []).map((shiftType) => ({
          id: shiftType.id,
          name: shiftType.code
            ? `${shiftType.code} — ${shiftType.name}`
            : shiftType.name
        }))
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getShiftAssignmentFormOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load assignment form options'
      }
    };
  }
}

export async function getShiftAssignmentFilterOptionsAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftAssignmentFilterOptions();
    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message ?? 'Failed to load shift assignment filters'
      );
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getShiftAssignmentFilterOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load shift assignment filters'
      }
    };
  }
}

export async function getShiftAssignmentSummaryAction() {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftAssignmentSummary();
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Unable to fetch shift assignment summary.'
      );
    }
    return {
      isError: false,
      data: result.data ?? {
        assignedStaff: 0,
        activeStaffTotal: 0,
        unassigned: 0,
        rotationPatterns: 0,
        expiringSoon: 0
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getShiftAssignmentSummaryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to fetch shift assignment summary.'
      }
    };
  }
}

export async function getShiftAssignmentHistoryAction(id: string) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftAssignmentHistory(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Unable to fetch shift assignment history.'
      );
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getShiftAssignmentHistoryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to fetch shift assignment history.'
      }
    };
  }
}

export async function createShiftAssignmentAction(data: ShiftAssignmentPayload) {
  await requirePermission('shift-roster', 'add');
  try {
    const payload = stripAuditFields({ ...data });
    const auditUser = await getAuditUser();
    const result = await createShiftAssignment(payload, auditUser);

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
        action: 'shift.assignment.created',
        entityType: 'ShiftAssignment',
        entityId: result.data?.id,
        importance: 'high',
        metadata: {
          code: result.data?.code,
          staffName: result.data?.staffName
        }
      });
    }

    revalidatePath('/shift-assignment');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('createShiftAssignmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function bulkCreateShiftAssignmentsAction(
  data: Omit<ShiftAssignmentPayload, 'staffId'> & { staffIds: string[] }
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as Omit<
      ShiftAssignmentPayload,
      'staffId'
    > & { staffIds: string[] };
    const auditUser = await getAuditUser();
    const result = await bulkCreateShiftAssignments(payload, auditUser);

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
        action: 'shift.assignment.bulkCreated',
        entityType: 'ShiftAssignment',
        importance: 'high',
        metadata: { count: result.data?.count ?? data.staffIds.length }
      });
    }

    revalidatePath('/shift-assignment');
    return {
      isError: false,
      data: { saved: true, count: result.data?.count ?? 0 },
      errors: {}
    };
  } catch (error: any) {
    console.error('bulkCreateShiftAssignmentsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateShiftAssignmentAction(
  id: string,
  data: Partial<ShiftAssignmentPayload>
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const payload = stripAuditFields({ ...data });
    const auditUser = await getAuditUser();
    const result = await updateShiftAssignment(id, payload, auditUser);

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
        action: 'shift.assignment.updated',
        entityType: 'ShiftAssignment',
        entityId: id,
        importance: 'high',
        metadata: {
          code: result.data?.code,
          staffName: result.data?.staffName
        }
      });
    }

    revalidatePath('/shift-assignment');
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateShiftAssignmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteShiftAssignmentAction(id: string) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteShiftAssignment(id);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error deleting data. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.assignment.deleted',
        entityType: 'ShiftAssignment',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/shift-assignment');
    return {
      isError: false,
      data: {},
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteShiftAssignmentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error deleting data. Please try again later'
      }
    };
  }
}

export async function bulkDeleteShiftAssignmentsAction(ids: string[]) {
  await requirePermission('shift-roster', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteShiftAssignments(ids);
    if (!result.success) {
      throw new Error(
        result.error?.message ??
          'Error deleting records. Please try again later'
      );
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.assignment.bulkDeleted',
        entityType: 'ShiftAssignment',
        importance: 'high',
        metadata: { count: ids.length }
      });
    }

    revalidatePath('/shift-assignment');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteShiftAssignmentsAction error:', error);
    throw new Error(
      error.message ?? 'Error deleting records. Please try again later'
    );
  }
}

export async function getShiftAssignmentsExport(params: GetShiftAssignmentsParams) {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await getShiftAssignmentsForExport(listParams(params));
    if (!result.success) {
      return {
        success: false,
        message: result.error?.message ?? 'Failed to export shift assignments',
        data: []
      };
    }
    return {
      success: true,
      data: result.data ?? [],
      message: result.message
    };
  } catch (error: any) {
    console.error('getShiftAssignmentsExport error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export shift assignments',
      data: []
    };
  }
}
