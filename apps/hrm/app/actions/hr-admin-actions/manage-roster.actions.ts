'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createManageRoster,
  deleteManageRoster,
  getManageRosterById,
  getManageRosterList,
  updateManageRoster
} from '@/services/hr-admin-services/manage-roster.service';
import { mapManageRosterToUiRecord } from '@/lib/mappers/manage-roster-form.mapper';
import type {
  GetManageRosterParams,
  ManageRosterPayload,
  ManageRosterUiRecord
} from '@/types/manage-roster';

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
  delete (payload as any).assignedStaffCount;
  delete (payload as any).activeShiftCount;
  return payload;
}

export async function getManageRosterListAction(
  params: GetManageRosterParams = {}
): Promise<{
  isError: boolean;
  data: ManageRosterUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('manage-rosters', 'view');
    const result = await getManageRosterList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load rosters');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapManageRosterToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getManageRosterListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getManageRosterByIdAction(id: string) {
  try {
    await requirePermission('manage-rosters', 'view');
    const result = await getManageRosterById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Roster not found');
    }
    return {
      isError: false,
      data: mapManageRosterToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getManageRosterByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch roster.' }
    };
  }
}

export async function createManageRosterAction(data: ManageRosterPayload) {
  await requirePermission('manage-rosters', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as ManageRosterPayload;
    const auditUser = await getAuditUser();
    const result = await createManageRoster(payload, auditUser);

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
        action: 'manage-rosters.created',
        entityType: 'ManageRoster',
        entityId: result.data.id,
        importance: 'high'
      });
    }

    revalidatePath('/manage-rosters');
    return {
      isError: false,
      data: mapManageRosterToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createManageRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateManageRosterAction(
  id: string,
  data: ManageRosterPayload
) {
  await requirePermission('manage-rosters', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as ManageRosterPayload;
    const auditUser = await getAuditUser();
    const result = await updateManageRoster(id, payload, auditUser);

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
        action: 'manage-rosters.updated',
        entityType: 'ManageRoster',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/manage-rosters');
    return {
      isError: false,
      data: mapManageRosterToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('updateManageRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteManageRosterAction(id: string) {
  await requirePermission('manage-rosters', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteManageRoster(id);

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
        action: 'manage-rosters.deleted',
        entityType: 'ManageRoster',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/manage-rosters');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteManageRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
