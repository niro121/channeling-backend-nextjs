'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  loadRoster,
  saveRosterAllocationDraft,
  toggleRosterAllocationLeave
} from '@/services/roster-services/shift-roster.service';
import type {
  LoadRosterParams,
  LoadRosterResult,
  SaveRosterAllocationDraftPayload,
  ToggleRosterAllocationLeavePayload
} from '@/types/roster';

export async function loadRosterAction(params: LoadRosterParams): Promise<{
  isError: boolean;
  data: LoadRosterResult | null;
  errors: Record<string, string | undefined>;
}> {
  try {
    await requirePermission('shift-roster', 'view');
    const result = await loadRoster(params);

    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to load roster. Please try again.'
        }
      };
    }

    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('loadRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load roster. Please try again.'
      }
    };
  }
}

export async function saveRosterAllocationDraftAction(
  data: SaveRosterAllocationDraftPayload
) {
  await requirePermission(
    'shift-roster',
    data.allocationId ? 'edit' : 'add'
  );
  try {
    const auditUser = await getAuditUser();
    const result = await saveRosterAllocationDraft(data, auditUser);

    if (!result.success) {
      return {
        isError: true,
        data: {},
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: data.allocationId
          ? 'shift.rosterAllocation.updated'
          : 'shift.rosterAllocation.created',
        entityType: 'RosterAllocation',
        entityId: result.data?.id,
        importance: 'high',
        metadata: {
          shiftRosterId: result.data?.shiftRosterId,
          rosterDate:
            typeof data.rosterDate === 'string'
              ? data.rosterDate
              : data.rosterDate.toISOString()
        }
      });
    }

    revalidatePath('/shift-roster');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id, shiftRosterId: result.data?.shiftRosterId },
      errors: {}
    };
  } catch (error: any) {
    console.error('saveRosterAllocationDraftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function toggleRosterAllocationLeaveAction(
  data: ToggleRosterAllocationLeavePayload
) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await toggleRosterAllocationLeave(data, auditUser);

    if (!result.success) {
      return {
        isError: true,
        data: {},
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.rosterAllocation.leaveToggled',
        entityType: 'RosterAllocation',
        entityId: result.data?.id,
        importance: 'medium',
        metadata: { isLeave: result.data?.isLeave ?? false }
      });
    }

    revalidatePath('/shift-roster');
    return {
      isError: false,
      data: { saved: true, id: result.data?.id, isLeave: result.data?.isLeave },
      errors: {}
    };
  } catch (error: any) {
    console.error('toggleRosterAllocationLeaveAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
