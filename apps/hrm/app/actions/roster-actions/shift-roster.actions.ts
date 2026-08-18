'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  copyPreviousMonthRoster,
  copyPreviousWeekRoster,
  fillNewRosterDraft,
  fillOldRosterDraft,
  loadRoster,
  publishRoster,
  saveRosterAllocationDraft,
  toggleRosterAllocationLeave
} from '@/services/roster-services/shift-roster.service';
import type {
  LoadRosterParams,
  LoadRosterResult,
  SaveRosterAllocationDraftPayload,
  ToggleRosterAllocationLeavePayload
} from '@/types/roster';

type RosterWorkflowPayload = {
  department?: string;
  unit?: string;
  roster?: string;
  fromDate: string;
  toDate: string;
};

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

export async function fillNewRosterDraftAction(data: RosterWorkflowPayload) {
  await requirePermission('shift-roster', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await fillNewRosterDraft(data, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to prepare draft roster');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.rosterDraft.created',
        entityType: 'ShiftRoster',
        importance: 'medium',
        metadata: { draftCount: result.data?.draftCount ?? 0, ...data }
      });
    }

    revalidatePath('/shift-roster');
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('fillNewRosterDraftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to prepare draft roster' }
    };
  }
}

export async function publishRosterAction(data: RosterWorkflowPayload) {
  await requirePermission('shift-roster', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await publishRoster(data, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to publish roster');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'shift.roster.published',
        entityType: 'ShiftRoster',
        importance: 'high',
        metadata: {
          rosterCount: result.data?.rosterCount ?? 0,
          allocationCount: result.data?.allocationCount ?? 0,
          ...data
        }
      });
    }

    revalidatePath('/shift-roster');
    return { isError: false, data: result.data ?? null, errors: {} };
  } catch (error: any) {
    console.error('publishRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to publish roster' }
    };
  }
}

async function handleCopyAction(
  action: 'previousWeek' | 'previousMonth' | 'fillOld',
  data: RosterWorkflowPayload
) {
  await requirePermission('shift-roster', 'add');
  const auditUser = await getAuditUser();
  const result =
    action === 'previousWeek'
      ? await copyPreviousWeekRoster(data, auditUser)
      : action === 'previousMonth'
        ? await copyPreviousMonthRoster(data, auditUser)
        : await fillOldRosterDraft(data, auditUser);

  if (!result.success) {
    throw new Error(result.error?.message ?? 'Failed to copy roster');
  }
  const copyData =
    'data' in result && result.data
      ? result.data
      : { copied: 0, skipped: 0 };

  if (auditUser?.id) {
    logActivityNonBlocking({
      userId: auditUser.id,
      action:
        action === 'previousWeek'
          ? 'shift.roster.copiedPreviousWeek'
          : action === 'previousMonth'
            ? 'shift.roster.copiedPreviousMonth'
            : 'shift.roster.filledOld',
      entityType: 'ShiftRoster',
      importance: 'high',
      metadata: { copied: copyData.copied, skipped: copyData.skipped, ...data }
    });
  }

  revalidatePath('/shift-roster');
  return { isError: false, data: copyData, errors: {} };
}

export async function copyPreviousWeekRosterAction(data: RosterWorkflowPayload) {
  try {
    return await handleCopyAction('previousWeek', data);
  } catch (error: any) {
    console.error('copyPreviousWeekRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to copy previous week roster' }
    };
  }
}

export async function copyPreviousMonthRosterAction(data: RosterWorkflowPayload) {
  try {
    return await handleCopyAction('previousMonth', data);
  } catch (error: any) {
    console.error('copyPreviousMonthRosterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to copy previous month roster' }
    };
  }
}

export async function fillOldRosterDraftAction(data: RosterWorkflowPayload) {
  try {
    return await handleCopyAction('fillOld', data);
  } catch (error: any) {
    console.error('fillOldRosterDraftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to fill old roster draft' }
    };
  }
}
