'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import {
  checkPermission,
  requirePermission
} from '@/lib/server-permissions';
import {
  createPaysheetComponent,
  deletePaysheetComponent,
  getPaysheetComponentById,
  getPaysheetComponentList,
  getPaysheetComponentOptions,
  updatePaysheetComponent
} from '@/services/hr-admin-services/paysheet-component.service';
import { mapPaysheetComponentToUiRecord } from '@/lib/mappers/paysheet-component-form.mapper';
import type {
  GetPaysheetComponentParams,
  PaysheetComponentOption,
  PaysheetComponentPayload,
  PaysheetComponentUiRecord
} from '@/types/paysheet-component';

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
  return payload;
}

export async function getPaysheetComponentListAction(
  params: GetPaysheetComponentParams = {}
): Promise<{
  isError: boolean;
  data: PaysheetComponentUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('paysheet-components', 'view');
    const result = await getPaysheetComponentList(params);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Failed to load paysheet components'
      );
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapPaysheetComponentToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getPaysheetComponentListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

/** Options for payroll assign filters/sheet (also usable from master). */
export async function getPaysheetComponentOptionsAction(
  params: GetPaysheetComponentParams = {}
): Promise<{
  isError: boolean;
  data: PaysheetComponentOption[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    const canPayroll = await checkPermission('payroll', 'view');
    const canMaster = await checkPermission('paysheet-components', 'view');
    if (!canPayroll && !canMaster) {
      throw new Error(
        "Access denied: You don't have permission to view paysheet components"
      );
    }
    const result = await getPaysheetComponentOptions(params);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Failed to load paysheet component options'
      );
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getPaysheetComponentOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Error getting options. Please try again later'
      }
    };
  }
}

export async function getPaysheetComponentByIdAction(id: string) {
  try {
    await requirePermission('paysheet-components', 'view');
    const result = await getPaysheetComponentById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Paysheet component not found');
    }
    return {
      isError: false,
      data: mapPaysheetComponentToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getPaysheetComponentByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to fetch paysheet component.'
      }
    };
  }
}

export async function createPaysheetComponentAction(
  data: PaysheetComponentPayload
) {
  await requirePermission('paysheet-components', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as PaysheetComponentPayload;
    const auditUser = await getAuditUser();
    const result = await createPaysheetComponent(payload, auditUser);

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
        action: 'paysheet-components.created',
        entityType: 'PaysheetComponent',
        entityId: result.data.id,
        importance: 'high'
      });
    }

    revalidatePath('/paysheet-components');
    return {
      isError: false,
      data: mapPaysheetComponentToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createPaysheetComponentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updatePaysheetComponentAction(
  id: string,
  data: PaysheetComponentPayload
) {
  await requirePermission('paysheet-components', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as PaysheetComponentPayload;
    const auditUser = await getAuditUser();
    const result = await updatePaysheetComponent(id, payload, auditUser);

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
        action: 'paysheet-components.updated',
        entityType: 'PaysheetComponent',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/paysheet-components');
    return {
      isError: false,
      data: mapPaysheetComponentToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('updatePaysheetComponentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deletePaysheetComponentAction(id: string) {
  await requirePermission('paysheet-components', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deletePaysheetComponent(id);

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
        action: 'paysheet-components.deleted',
        entityType: 'PaysheetComponent',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/paysheet-components');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deletePaysheetComponentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
