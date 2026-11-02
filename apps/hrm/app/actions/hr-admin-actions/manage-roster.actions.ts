'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  assignStaffToManageRoster,
  createManageRoster,
  deleteManageRoster,
  getManageRosterById,
  getManageRosterInspectData,
  getManageRosterList,
  getStaffRosterAssignCandidates,
  getStaffRosterMembers,
  removeStaffFromManageRoster,
  updateManageRoster
} from '@/services/hr-admin-services/manage-roster.service';
import { mapManageRosterToUiRecord } from '@/lib/mappers/manage-roster-form.mapper';
import type {
  AssignStaffToManageRosterPayload,
  GetManageRosterParams,
  GetStaffRosterMembersParams,
  ManageRosterInspectData,
  ManageRosterPayload,
  ManageRosterUiRecord,
  RemoveStaffFromManageRosterPayload,
  StaffRosterAssignCandidate,
  StaffRosterMemberRow,
  StaffRosterMembershipMutationResult
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

export async function getManageRosterInspectDataAction(id: string): Promise<{
  isError: boolean;
  data: ManageRosterInspectData | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('manage-rosters', 'view');
    const result = await getManageRosterInspectData(id);
    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message ?? 'Failed to load roster inspect data'
      );
    }
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('getManageRosterInspectDataAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Failed to load roster inspect data'
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

export async function getStaffRosterMembersAction(
  params: GetStaffRosterMembersParams
): Promise<{
  isError: boolean;
  data: StaffRosterMemberRow[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('manage-rosters', 'view');
    const result = await getStaffRosterMembers(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load roster members');
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffRosterMembersAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load roster members'
      }
    };
  }
}

export async function getStaffRosterAssignCandidatesAction(params?: {
  keyword?: string;
}): Promise<{
  isError: boolean;
  data: StaffRosterAssignCandidate[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('manage-rosters', 'view');
    const result = await getStaffRosterAssignCandidates(params);
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Failed to load staff assign candidates'
      );
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {}
    };
  } catch (error: any) {
    console.error('getStaffRosterAssignCandidatesAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load staff assign candidates'
      }
    };
  }
}

export async function assignStaffToManageRosterAction(
  payload: AssignStaffToManageRosterPayload
): Promise<{
  isError: boolean;
  data: StaffRosterMembershipMutationResult | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('manage-rosters', 'edit');
    const auditUser = await getAuditUser();
    const result = await assignStaffToManageRoster(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: result.data ?? null,
        errors: {
          message:
            result.error?.message ??
            'Failed to assign staff to the roster group'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'manage-rosters.staff-assigned',
        entityType: 'ManageRoster',
        entityId: payload.rosterId,
        importance: 'medium',
        metadata: {
          updatedCount: result.data?.updatedCount ?? 0,
          staffIds: payload.staffIds
        }
      });
    }

    revalidatePath('/manage-rosters');
    revalidatePath('/staff');
    return {
      isError: false,
      data: result.data ?? null,
      errors: {}
    };
  } catch (error: any) {
    console.error('assignStaffToManageRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Failed to assign staff to the roster group'
      }
    };
  }
}

export async function removeStaffFromManageRosterAction(
  payload: RemoveStaffFromManageRosterPayload
): Promise<{
  isError: boolean;
  data: StaffRosterMembershipMutationResult | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('manage-rosters', 'edit');
    const auditUser = await getAuditUser();
    const result = await removeStaffFromManageRoster(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: result.data ?? null,
        errors: {
          message:
            result.error?.message ??
            'Failed to remove staff from the roster group'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'manage-rosters.staff-removed',
        entityType: 'ManageRoster',
        entityId: payload.rosterId,
        importance: 'medium',
        metadata: {
          updatedCount: result.data?.updatedCount ?? 0,
          staffIds: payload.staffIds
        }
      });
    }

    revalidatePath('/manage-rosters');
    revalidatePath('/staff');
    return {
      isError: false,
      data: result.data ?? null,
      errors: {}
    };
  } catch (error: any) {
    console.error('removeStaffFromManageRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error.message ?? 'Failed to remove staff from the roster group'
      }
    };
  }
}
