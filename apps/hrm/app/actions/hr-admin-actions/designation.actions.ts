'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createDesignation,
  deleteDesignation,
  getDesignationById,
  getDesignationList,
  updateDesignation
} from '@/services/hr-admin-services/designation.service';
import { mapDesignationToUiRecord } from '@/lib/mappers/designation-form.mapper';
import type {
  GetDesignationParams,
  DesignationPayload,
  DesignationUiRecord
} from '@/types/designation';

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
  delete (payload as any).createdByUser;
  delete (payload as any).updatedByUser;
  delete (payload as any).staffCount;
  return payload;
}

export async function getDesignationListAction(
  params: GetDesignationParams = {}
): Promise<{
  isError: boolean;
  data: DesignationUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('designations', 'view');
    const result = await getDesignationList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load designations');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapDesignationToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getDesignationListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getDesignationByIdAction(id: string) {
  try {
    await requirePermission('designations', 'view');
    const result = await getDesignationById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Designation not found');
    }
    return {
      isError: false,
      data: mapDesignationToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getDesignationByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch designation.' }
    };
  }
}

export async function createDesignationAction(data: DesignationPayload) {
  await requirePermission('designations', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as DesignationPayload;
    const auditUser = await getAuditUser();
    const result = await createDesignation(payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: null
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'designations.created',
        entityType: 'Designation',
        entityId: result.data.id,
        importance: 'high'
      });
    }

    revalidatePath('/designations');
    return {
      isError: false,
      data: mapDesignationToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createDesignationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateDesignationAction(
  id: string,
  data: DesignationPayload
) {
  await requirePermission('designations', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as DesignationPayload;
    const auditUser = await getAuditUser();
    const result = await updateDesignation(id, payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: null
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'designations.updated',
        entityType: 'Designation',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/designations');
    return {
      isError: false,
      data: mapDesignationToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('updateDesignationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteDesignationAction(id: string) {
  await requirePermission('designations', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteDesignation(id);

    if (!result.success) {
      return {
        isError: true,
        errors: {
          message:
            result.error?.message ??
            'Something went wrong. Please try again later'
        },
        data: null
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'designations.deleted',
        entityType: 'Designation',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/designations');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteDesignationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
