'use server';

import { revalidatePath } from 'next/cache';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createStaff,
  deleteStaff,
  deleteStaffs,
  getStaff,
  getStaffById,
  getStaffOptions,
  updateStaff
} from '@/services/staff-services/staff.service';
import type { GetStaffParams, Staff } from '@/types/staff';

export async function getStaffOptionsAction(): Promise<{
  isError: boolean;
  data: { id: string; name: string; code: string }[] | null;
  errors: { message?: string };
}> {
  try {
    await requirePermission('staff', 'view');
    const result = await getStaffOptions();
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Failed to load staff options' }
      };
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffOptionsAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to load staff options' }
    };
  }
}

export async function getStaffAction(params: GetStaffParams) {
  try {
    await requirePermission('staff', 'view');
    const result = await getStaff(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error getting data. Please try again later');
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
    console.error('getStaffAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Error getting data. Please try again later' }
    };
  }
}

export async function getStaffByIdAction(id: string) {
  try {
    await requirePermission('staff', 'view');
    const result = await getStaffById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Staff not found');
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch staff.' }
    };
  }
}

export async function createStaffAction(data: Staff) {
  await requirePermission('staff', 'add');
  try {
    const payload = { ...data };
    delete (payload as any).id;
    delete (payload as any).createdAt;
    delete (payload as any).updatedAt;
    delete (payload as any).createdBy;
    delete (payload as any).updatedBy;
    delete (payload as any).createdUser;
    delete (payload as any).updatedUser;

    const auditUser = await getAuditUser();
    const result = await createStaff(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ??
          { message: result.error?.message ?? 'Something went wrong. Please try again later' },
        data: {}
      };
    }

    revalidatePath('/staff');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id },
      errors: {}
    };
  } catch (error: any) {
    console.error('createStaffAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Something went wrong. Please try again later' }
    };
  }
}

export async function updateStaffAction(id: string, data: Partial<Staff>) {
  await requirePermission('staff', 'edit');
  try {
    const payload = { ...data };
    delete (payload as any).id;
    delete (payload as any).createdAt;
    delete (payload as any).updatedAt;
    delete (payload as any).createdBy;
    delete (payload as any).updatedBy;
    delete (payload as any).createdUser;
    delete (payload as any).updatedUser;

    const auditUser = await getAuditUser();
    const result = await updateStaff(id, payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ??
          { message: result.error?.message ?? 'Something went wrong. Please try again later' },
        data: {}
      };
    }

    revalidatePath('/staff');
    return {
      isError: false,
      data: { saved: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateStaffAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Something went wrong. Please try again later' }
    };
  }
}

export async function deleteStaffAction(id: string) {
  await requirePermission('staff', 'delete');
  try {
    const result = await deleteStaff(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error deleting data. Please try again later');
    }

    revalidatePath('/staff');
    return { isError: false, data: null, errors: {} };
  } catch (error: any) {
    console.error('deleteStaffAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Error deleting data. Please try again later' }
    };
  }
}

export async function bulkDeleteStaffAction(ids: string[]) {
  await requirePermission('staff', 'delete');
  try {
    const result = await deleteStaffs(ids);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error deleting records. Please try again later');
    }

    revalidatePath('/staff');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteStaffAction error:', error);
    throw new Error(error.message ?? 'Error deleting records. Please try again later');
  }
}
