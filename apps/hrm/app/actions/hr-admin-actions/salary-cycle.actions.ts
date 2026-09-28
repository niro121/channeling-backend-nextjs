'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { mapSalaryCycleToUiRecord } from '@/lib/mappers/salary-cycle-form.mapper';
import {
  createSalaryCycle,
  deleteSalaryCycle,
  getSalaryCycleById,
  getSalaryCycleList,
  updateSalaryCycle
} from '@/services/hr-admin-services/salary-cycle.service';
import type {
  GetSalaryCycleParams,
  SalaryCyclePayload,
  SalaryCycleUiRecord
} from '@/types/salary-cycle';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).createdByUser;
  delete (payload as any).updatedByUser;
  return payload;
}

export async function getSalaryCycleListAction(
  params: GetSalaryCycleParams = {}
): Promise<{
  isError: boolean;
  data: SalaryCycleUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('salary-cycles', 'view');
    const result = await getSalaryCycleList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load salary cycles');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapSalaryCycleToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getSalaryCycleListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getSalaryCycleByIdAction(id: string) {
  try {
    await requirePermission('salary-cycles', 'view');
    const result = await getSalaryCycleById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Salary cycle not found');
    }
    return {
      isError: false,
      data: mapSalaryCycleToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getSalaryCycleByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to fetch salary cycle.'
      }
    };
  }
}

export async function createSalaryCycleAction(
  data: SalaryCyclePayload
): Promise<{
  isError: boolean;
  data: SalaryCycleUiRecord | null;
  errors: Record<string, unknown>;
}> {
  await requirePermission('salary-cycles', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as SalaryCyclePayload;
    const auditUser = await getAuditUser();
    const result = await createSalaryCycle(payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: result.error?.issues
          ? result.error.issues
          : { message: result.error?.message ?? 'Failed to create cycle' }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-cycles.created',
        entityType: 'SalaryCycle',
        entityId: result.data.id,
        importance: 'medium'
      });
    }

    revalidatePath('/salary-cycles');
    return {
      isError: false,
      data: mapSalaryCycleToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createSalaryCycleAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to create salary cycle.'
      }
    };
  }
}

export async function updateSalaryCycleAction(
  id: string,
  data: SalaryCyclePayload
): Promise<{
  isError: boolean;
  data: SalaryCycleUiRecord | null;
  errors: Record<string, unknown>;
}> {
  await requirePermission('salary-cycles', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as SalaryCyclePayload;
    const auditUser = await getAuditUser();
    const result = await updateSalaryCycle(id, payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: result.error?.issues
          ? result.error.issues
          : { message: result.error?.message ?? 'Failed to update cycle' }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-cycles.updated',
        entityType: 'SalaryCycle',
        entityId: result.data.id,
        importance: 'medium'
      });
    }

    revalidatePath('/salary-cycles');
    return {
      isError: false,
      data: mapSalaryCycleToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('updateSalaryCycleAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to update salary cycle.'
      }
    };
  }
}

export async function deleteSalaryCycleAction(id: string): Promise<{
  isError: boolean;
  data: null;
  errors: Record<string, unknown>;
}> {
  await requirePermission('salary-cycles', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteSalaryCycle(id);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Failed to delete cycle' }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-cycles.deleted',
        entityType: 'SalaryCycle',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/salary-cycles');
    return { isError: false, data: null, errors: {} };
  } catch (error: any) {
    console.error('deleteSalaryCycleAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to delete salary cycle.'
      }
    };
  }
}
