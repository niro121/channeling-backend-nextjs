'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { mapHrmVariableToUiRecord } from '@/lib/mappers/hrm-variable-form.mapper';
import {
  createPayeSlab,
  deletePayeSlab,
  getHrmVariable,
  upsertStatutoryRates
} from '@/services/hr-admin-services/hrm-variable.service';
import type {
  HrmPayeSlabPayload,
  HrmStatutoryRatesPayload,
  HrmVariableUiRecord
} from '@/types/hrm-variable';

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

export async function getHrmVariableAction(): Promise<{
  isError: boolean;
  data: HrmVariableUiRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('hrm-variables', 'view');
    const result = await getHrmVariable();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load HRM variables');
    }
    return {
      isError: false,
      data: mapHrmVariableToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getHrmVariableAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function saveStatutoryRatesAction(
  data: HrmStatutoryRatesPayload
): Promise<{
  isError: boolean;
  data: HrmVariableUiRecord | null;
  errors: Record<string, unknown>;
}> {
  await requirePermission('hrm-variables', 'edit');
  try {
    const payload = stripAuditFields({
      ...data
    }) as HrmStatutoryRatesPayload;
    const auditUser = await getAuditUser();
    const result = await upsertStatutoryRates(payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: result.error?.issues
          ? result.error.issues
          : { message: result.error?.message ?? 'Failed to save rates' }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'hrm-variables.rates.updated',
        entityType: 'HrmVariable',
        entityId: result.data.id,
        importance: 'medium'
      });
    }

    revalidatePath('/hrm-variables');
    return {
      isError: false,
      data: mapHrmVariableToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('saveStatutoryRatesAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to save statutory rates.'
      }
    };
  }
}

export async function createPayeSlabAction(
  data: HrmPayeSlabPayload
): Promise<{
  isError: boolean;
  data: HrmVariableUiRecord | null;
  errors: Record<string, unknown>;
}> {
  await requirePermission('hrm-variables', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as HrmPayeSlabPayload;
    const auditUser = await getAuditUser();
    const result = await createPayeSlab(payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: result.error?.issues
          ? result.error.issues
          : { message: result.error?.message ?? 'Failed to add slab' }
      };
    }

    if (auditUser?.id) {
      const newSlab = result.data.slabs[result.data.slabs.length - 1];
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'hrm-variables.slab.created',
        entityType: 'HrmPayeSlab',
        entityId: newSlab?.id ?? result.data.id,
        importance: 'medium'
      });
    }

    revalidatePath('/hrm-variables');
    return {
      isError: false,
      data: mapHrmVariableToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createPayeSlabAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to add PAYE slab.'
      }
    };
  }
}

export async function deletePayeSlabAction(id: string): Promise<{
  isError: boolean;
  data: HrmVariableUiRecord | null;
  errors: Record<string, unknown>;
}> {
  await requirePermission('hrm-variables', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deletePayeSlab(id, auditUser);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Failed to delete slab' }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'hrm-variables.slab.deleted',
        entityType: 'HrmPayeSlab',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/hrm-variables');
    return {
      isError: false,
      data: result.data
        ? mapHrmVariableToUiRecord(result.data)
        : null,
      errors: {}
    };
  } catch (error: any) {
    console.error('deletePayeSlabAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to delete PAYE slab.'
      }
    };
  }
}
