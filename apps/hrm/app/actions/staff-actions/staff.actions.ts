'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
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
import {
  syncAllStaffFromChanneling,
  // syncStaffByIdFromChanneling
} from '@/services/staff-services/staff-sync.service';
import type { GetStaffParams, Staff } from '@/types/staff';

// ** Get Staff List Action * //
export async function getStaffAction(params: GetStaffParams) {
  const newParams: GetStaffParams = {
    page: params.page ? process.env.DEFAULT_PAGE_SIZE : "0",
    limit: params.limit ? process.env.DEFAULT_PER_PAGE: "10",
    keyword: params.keyword ?? ''
  };
  try {
    await requirePermission('staff', 'view');
    const result = await getStaff(newParams);
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

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.created',
        entityType: 'Staff',
        entityId: result.data?.id ?? undefined,
        importance: 'high'
      });
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

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.updated',
        entityType: 'Staff',
        entityId: id,
        importance: 'high'
      });
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
    const auditUser = await getAuditUser();
    const result = await deleteStaff(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error deleting data. Please try again later');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.deleted',
        entityType: 'Staff',
        entityId: id,
        importance: 'high'
      });
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
    const auditUser = await getAuditUser();
    const result = await deleteStaffs(ids);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error deleting records. Please try again later');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.bulkDeleted',
        entityType: 'Staff',
        importance: 'high',
        metadata: { count: ids.length }
      });
    }

    revalidatePath('/staff');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteStaffAction error:', error);
    throw new Error(error.message ?? 'Error deleting records. Please try again later');
  }
}

/** Sync all staff from the Channeling public API. */
export async function syncStaffFromChannelingAction(keyword = '') {
  await requirePermission('staff', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await syncAllStaffFromChanneling(auditUser, keyword);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Failed to sync staff from Channeling' }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.syncedFromChanneling',
        entityType: 'Staff',
        importance: 'high',
        metadata: result.data
      });
    }

    revalidatePath('/staff');
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('syncStaffFromChannelingAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to sync staff from Channeling' }
    };
  }
}

// NO NEED
/** Sync a staff record by ID from the Channeling public API. */
/* export async function syncStaffByIdFromChannelingAction(channelingStaffId: string) {
  await requirePermission('staff', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await syncStaffByIdFromChanneling(channelingStaffId, auditUser);

    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Failed to sync staff from Channeling' }
      };
    }

    if (auditUser?.id && result.data?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.syncedFromChanneling',
        entityType: 'Staff',
        entityId: result.data.id,
        importance: 'high',
        metadata: { channelingStaffId, action: result.action }
      });
    }

    revalidatePath('/staff');
    return {
      isError: false,
      data: {
        id: result.data?.id,
        action: result.action,
        message: result.message
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('syncStaffByIdFromChannelingAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to sync staff from Channeling' }
    };
  }
} */
