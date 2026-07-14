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
  updateStaff,
  updateStaffEmployment,
  updateStaffPersonnel
} from '@/services/staff-services/staff.service';
import {
  syncAllStaffFromChanneling,
  // syncStaffByIdFromChanneling
} from '@/services/staff-services/staff-sync.service';
import type {
  GetStaffParams,
  StaffCrudOptions,
  StaffEmploymentPayload,
  StaffGeneralPayload,
  StaffPersonnelPayload
} from '@/types/staff';
import { staffRecordToChannelingPayload } from '@/lib/helpers/staff-channeling-fields.helper';
import {
  pushStaffBulkDeleteToChanneling,
  pushStaffCreateToChanneling,
  pushStaffDeleteToChanneling,
  pushStaffUpdateToChanneling,
  countLinkedChannelingStaff,
  getChannelingStaffIdsByHrmIds
} from '@/services/staff-services/staff-channeling-push.service';
import { personnelPayloadToStaffRecordSlice } from '@/lib/mappers/staff-personnel-details.mapper';

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

// ** Get Staff By ID Action * //
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

// ** Create Staff Action * //
export async function createStaffAction(
  data: StaffGeneralPayload,
  options?: StaffCrudOptions
) {
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

    const hrmStaffId = result.data?.id as string | undefined;
    let channelingWarning: string | undefined;
    const shouldSyncToChanneling = options?.syncToChanneling ?? true;

    if (shouldSyncToChanneling && hrmStaffId && result.data) {
      const channelingResult = await pushStaffCreateToChanneling(
        hrmStaffId,
        staffRecordToChannelingPayload(result.data)
      );

      if (!channelingResult.success) {
        await deleteStaff(hrmStaffId);
        return {
          isError: true,
          errors: {
            message:
              channelingResult.error?.message ??
              'Staff could not be created in Channeling. No record was saved in HRM.'
          },
          data: {}
        };
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.created',
        entityType: 'Staff',
        entityId: hrmStaffId,
        importance: 'high'
      });
    }

    revalidatePath('/staff');
    return {
      isError: false,
      data: {
        saved: true,
        id: hrmStaffId,
        channelingSynced: shouldSyncToChanneling && !channelingWarning,
        channelingWarning
      },
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

// ** Update Staff Action * //
export async function updateStaffAction(
  id: string,
  data: Partial<StaffGeneralPayload>,
  options?: StaffCrudOptions
) {
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

    const existingResult = await getStaffById(id);
    const existing = existingResult.data;
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

    let channelingWarning: string | undefined;

    if (options?.syncToChanneling && result.data) {
      const channelingResult = await pushStaffUpdateToChanneling(
        id,
        existing?.migrateSourceId,
        staffRecordToChannelingPayload(result.data)
      );

      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Staff was updated in HRM, but Channeling sync failed.';
      }
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
      data: {
        saved: true,
        channelingSynced: options?.syncToChanneling && !channelingWarning,
        channelingWarning
      },
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

// ** Update Staff Personnel (HR Details tab) Action * //
export async function updateStaffPersonnelAction(
  id: string,
  data: StaffPersonnelPayload,
  options?: StaffCrudOptions
) {
  await requirePermission('staff', 'edit');
  try {
    const existingResult = await getStaffById(id);
    const existing = existingResult.data;
    const auditUser = await getAuditUser();
    const result = await updateStaffPersonnel(id, data, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ??
          { message: result.error?.message ?? 'Something went wrong. Please try again later' },
        data: {}
      };
    }

    let channelingWarning: string | undefined;

    if (options?.syncToChanneling && existing) {
      const updatedSlice = personnelPayloadToStaffRecordSlice(data);
      const channelingResult = await pushStaffUpdateToChanneling(
        id,
        existing.migrateSourceId,
        {
          code: existing.code,
          title: updatedSlice.title ?? existing.title,
          name: updatedSlice.name ?? existing.name,
          nic: updatedSlice.nic ?? existing.nic,
          dateOfBirth: updatedSlice.dateOfBirth ?? existing.dateOfBirth,
          gender: existing.gender,
          contactMobile: updatedSlice.contactMobile ?? existing.contactMobile,
          address: existing.address,
          dateJoined: existing.dateJoined,
          status: existing.status
        }
      );

      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Staff HR details were saved in HRM, but Channeling sync failed.';
      }
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'staff.staff.personnelUpdated',
        entityType: 'Staff',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/staff');
    return {
      isError: false,
      data: {
        saved: true,
        channelingSynced: options?.syncToChanneling && !channelingWarning,
        channelingWarning
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateStaffPersonnelAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Something went wrong. Please try again later' }
    };
  }
}

// ** Update Staff Employment Details Action * //
export async function updateStaffEmploymentAction(
  id: string,
  data: StaffEmploymentPayload
) {
  await requirePermission('staff', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateStaffEmployment(id, data, auditUser);

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
        action: 'staff.staff.employmentUpdated',
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
    console.error('updateStaffEmploymentAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Something went wrong. Please try again later' }
    };
  }
}

// ** Delete Staff Action * //
export async function deleteStaffAction(id: string, options?: StaffCrudOptions) {
  await requirePermission('staff', 'delete');
  try {
    const existingResult = await getStaffById(id);
    const migrateSourceId = existingResult.data?.migrateSourceId;

    const auditUser = await getAuditUser();
    const result = await deleteStaff(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error deleting data. Please try again later');
    }

    let channelingWarning: string | undefined;

    if (options?.syncToChanneling) {
      const channelingResult = await pushStaffDeleteToChanneling(migrateSourceId);
      if (!channelingResult.success) {
        channelingWarning =
          channelingResult.error?.message ??
          'Staff was deleted in HRM, but Channeling sync failed.';
      }
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
    return {
      isError: false,
      data: { channelingWarning },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteStaffAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Error deleting data. Please try again later' }
    };
  }
}

// ** Bulk Delete Staff Action * //
export async function bulkDeleteStaffAction(ids: string[]) {
  await requirePermission('staff', 'delete');
  try {
    const auditUser = await getAuditUser();
    const linkedRecords = await getChannelingStaffIdsByHrmIds(ids);
    const migrateSourceIds = linkedRecords
      .map((record) => record.channelingId)
      .filter(Boolean);

    const result = await deleteStaffs(ids);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error deleting records. Please try again later');
    }

    if (migrateSourceIds.length > 0) {
      const channelingResult = await pushStaffBulkDeleteToChanneling(migrateSourceIds);
      if (!channelingResult.success) {
        throw new Error(
          channelingResult.error?.message ??
            'Records were deleted in HRM, but Channeling sync failed.'
        );
      }
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

/** Build bulk delete dialog copy for staff linked to Channeling. */
export async function getStaffBulkDeleteDescriptionAction(ids: string[]): Promise<string> {
  'use server';

  const linkedCount = await countLinkedChannelingStaff(ids);
  const { buildChannelingSyncDialogDescription } = await import(
    '@/lib/helpers/staff-channeling-dialog.helper'
  );

  return buildChannelingSyncDialogDescription({
    mode: 'bulkDelete',
    linkedCount,
    totalCount: ids.length
  });
}

//** Get Staff Options Action * //
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

//** Staff Exports */
export const getStaffExport = async (params: { keyword?: string }) => {
  try {
    const response = await getStaffAction({
      page: "1",
      limit: process.env.EXPORT_LIMIT ?? "10000", // Get all records
      keyword: params.keyword ?? ""
    });

    if (response.isError || !response.data?.data?.length) {
      return {
        success: false,
        message: response.isError 
          ? (response.errors?.message || 'Error getting data')
          : 'No staff found'
      };
    }
    const auditUser = await getAuditUser();
    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: "staff.exported",
        entityType: "Staff",
        importance: "medium",
        metadata: { count: response.data?.data?.length ?? 0 },
      })
    }
    return {
      success: true,
      data: response.data.data
    };
  } catch (error: any) {
    console.log('getStaffExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};

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
