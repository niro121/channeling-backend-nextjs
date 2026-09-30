'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createSalaryStructure,
  deleteSalaryStructure,
  duplicateSalaryStructure,
  getSalaryStructureById,
  getSalaryStructureList,
  getSalaryStructureOptions,
  getSalaryStructureSummary,
  setSalaryStructureStatus,
  updateSalaryStructure
} from '@/services/payroll-services/salary-structure.service';
import type {
  GetSalaryStructureParams,
  SalaryStructurePayload,
  SalaryStructureRecord,
  SalaryStructureStatus,
  SalaryStructureSummary
} from '@/types/payroll';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).institution;
  delete (payload as any).department;
  delete (payload as any).staffCategory;
  delete (payload as any).designation;
  delete (payload as any).allowancesTotal;
  delete (payload as any).deductionsTotal;
  delete (payload as any).gross;
  delete (payload as any).staffCovered;
  return payload;
}

export async function getSalaryStructureListAction(
  params: GetSalaryStructureParams = {}
): Promise<{
  isError: boolean;
  data: SalaryStructureRecord[] | null;
  total: number;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getSalaryStructureList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load structures');
    }
    return {
      isError: false,
      data: result.data ?? [],
      total: result.total ?? 0,
      errors: {}
    };
  } catch (error: any) {
    console.error('getSalaryStructureListAction error:', error);
    return {
      isError: true,
      data: null,
      total: 0,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getSalaryStructureSummaryAction(
  params: GetSalaryStructureParams = {}
): Promise<{
  isError: boolean;
  data: SalaryStructureSummary | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getSalaryStructureSummary(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load summary');
    }
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('getSalaryStructureSummaryAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting summary. Please try again later'
      }
    };
  }
}

export async function getSalaryStructureOptionsAction(): Promise<{
  isError: boolean;
  data: { id: string; name: string }[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'view');
    const result = await getSalaryStructureOptions();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load options');
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getSalaryStructureOptionsAction error:', error);
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

export async function getSalaryStructureByIdAction(id: string) {
  try {
    await requirePermission('payroll', 'view');
    const result = await getSalaryStructureById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Salary structure not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getSalaryStructureByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function createSalaryStructureAction(
  data: SalaryStructurePayload
): Promise<{
  isError: boolean;
  data: SalaryStructureRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as SalaryStructurePayload;
    const result = await createSalaryStructure(payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to create structure',
          ...(result.error?.issues ? { issues: result.error.issues } : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-structures.created',
        entityType: 'SalaryStructure',
        entityId: result.data.id,
        importance: 'medium'
      });
    }

    revalidatePath('/salary-structures');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createSalaryStructureAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error saving. Please try again later'
      }
    };
  }
}

export async function updateSalaryStructureAction(
  id: string,
  data: SalaryStructurePayload
): Promise<{
  isError: boolean;
  data: SalaryStructureRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const payload = stripAuditFields(
      data as unknown as Record<string, unknown>
    ) as unknown as SalaryStructurePayload;
    const result = await updateSalaryStructure(id, payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to update structure',
          ...(result.error?.issues ? { issues: result.error.issues } : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-structures.updated',
        entityType: 'SalaryStructure',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/salary-structures');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateSalaryStructureAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error saving. Please try again later'
      }
    };
  }
}

export async function duplicateSalaryStructureAction(id: string): Promise<{
  isError: boolean;
  data: SalaryStructureRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'add');
    const auditUser = await getAuditUser();
    const result = await duplicateSalaryStructure(id, auditUser);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to duplicate');
    }
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-structures.duplicated',
        entityType: 'SalaryStructure',
        entityId: result.data.id,
        importance: 'medium'
      });
    }
    revalidatePath('/salary-structures');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('duplicateSalaryStructureAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error duplicating. Please try again later'
      }
    };
  }
}

export async function setSalaryStructureStatusAction(
  id: string,
  status: SalaryStructureStatus
): Promise<{
  isError: boolean;
  data: SalaryStructureRecord | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'edit');
    const auditUser = await getAuditUser();
    const result = await setSalaryStructureStatus(id, status, auditUser);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to update status');
    }
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-structures.status-updated',
        entityType: 'SalaryStructure',
        entityId: id,
        importance: 'low'
      });
    }
    revalidatePath('/salary-structures');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('setSalaryStructureStatusAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error updating status. Please try again later'
      }
    };
  }
}

export async function deleteSalaryStructureAction(id: string): Promise<{
  isError: boolean;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('payroll', 'delete');
    const auditUser = await getAuditUser();
    const result = await deleteSalaryStructure(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to delete');
    }
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'salary-structures.deleted',
        entityType: 'SalaryStructure',
        entityId: id,
        importance: 'high'
      });
    }
    revalidatePath('/salary-structures');
    return { isError: false, errors: {} };
  } catch (error: any) {
    console.error('deleteSalaryStructureAction error:', error);
    return {
      isError: true,
      errors: {
        message: error.message ?? 'Error deleting. Please try again later'
      }
    };
  }
}
