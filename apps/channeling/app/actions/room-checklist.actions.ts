'use server';

import { revalidatePath } from 'next/cache';
import { fetchServerSession } from '@/lib/session';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { checklistFormsCan, roomStaysCan } from '@/lib/room-checklist-access';
import { userTypes } from '@/lib/roles';
import {
  ChecklistError,
  cancelStay,
  deleteChecklistTemplate,
  duplicateChecklistTemplate,
  saveChecklistTemplate,
  setChecklistTemplateStatus,
} from '@/services/room-checklist.service';
import type { ActionResult, TemplateInput, TemplateRow, TemplateStatus } from '@/types/room-checklist';
import type { Permissions } from '@/types/user-group';

async function currentUser() {
  const session = await fetchServerSession();
  const userId = session?.user?.id;
  if (!userId) throw new ChecklistError('Please sign in again.');
  return {
    userId,
    permissions: (session.user?.permissions ?? null) as Permissions | null,
    isAdmin: session.user?.userType === userTypes.admin,
  };
}

async function requireForms(need: 'edit' | 'publish') {
  const u = await currentUser();
  if (!checklistFormsCan(u.permissions, u.isAdmin)[need]) {
    throw new ChecklistError(
      need === 'edit' ? "You don't have permission to edit checklist forms." : "You don't have permission to publish checklist forms."
    );
  }
  return u.userId;
}

function failure(error: unknown): ActionResult<never> {
  if (error instanceof ChecklistError) return { success: false, message: error.message };
  console.error('[room-checklist] action failed', error);
  return { success: false, message: 'Something went wrong. Please try again.' };
}

export async function saveChecklistTemplateAction(
  id: string | null,
  input: TemplateInput
): Promise<ActionResult<TemplateRow>> {
  try {
    const userId = await requireForms('edit');
    const row = await saveChecklistTemplate(id, input, userId);
    logActivityNonBlocking({
      userId,
      action: id ? 'roomChecklists.form.updated' : 'roomChecklists.form.created',
      entityType: 'ChecklistTemplate',
      entityId: row.id,
      importance: 'medium',
      metadata: { name: row.name, kind: row.kind, version: row.version },
    });
    revalidatePath('/room-checklists');
    return { success: true, message: id ? 'Form saved' : 'Form created', data: row };
  } catch (e) {
    return failure(e);
  }
}

export async function setChecklistTemplateStatusAction(id: string, status: TemplateStatus): Promise<ActionResult> {
  try {
    const userId = await requireForms('publish');
    const r = await setChecklistTemplateStatus(id, status, userId);
    logActivityNonBlocking({
      userId,
      action: 'roomChecklists.form.statusChanged',
      entityType: 'ChecklistTemplate',
      entityId: id,
      importance: 'high',
      metadata: r,
    });
    revalidatePath('/room-checklists');
    const label = status === 'published' ? 'Form published' : status === 'archived' ? 'Form archived' : 'Form moved to draft';
    return { success: true, message: label };
  } catch (e) {
    return failure(e);
  }
}

export async function duplicateChecklistTemplateAction(id: string): Promise<ActionResult<TemplateRow>> {
  try {
    const userId = await requireForms('edit');
    const row = await duplicateChecklistTemplate(id, userId);
    logActivityNonBlocking({
      userId,
      action: 'roomChecklists.form.created',
      entityType: 'ChecklistTemplate',
      entityId: row.id,
      importance: 'medium',
      metadata: { name: row.name, copiedFrom: id },
    });
    revalidatePath('/room-checklists');
    return { success: true, message: 'Copy created', data: row };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteChecklistTemplateAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireForms('publish');
    const name = await deleteChecklistTemplate(id);
    logActivityNonBlocking({
      userId,
      action: 'roomChecklists.form.deleted',
      entityType: 'ChecklistTemplate',
      entityId: id,
      importance: 'high',
      metadata: { name },
    });
    revalidatePath('/room-checklists');
    return { success: true, message: 'Form deleted' };
  } catch (e) {
    return failure(e);
  }
}

export async function cancelStayAction(stayId: string, reason: string): Promise<ActionResult> {
  try {
    const u = await currentUser();
    if (!roomStaysCan(u.permissions, u.isAdmin).override) {
      throw new ChecklistError("You don't have permission to cancel a check-in.");
    }
    const r = await cancelStay(stayId, reason, u.userId);
    logActivityNonBlocking({
      userId: u.userId,
      action: 'roomStays.cancelled',
      entityType: 'RoomStay',
      entityId: stayId,
      importance: 'high',
      metadata: { ...r, reason, source: 'web' },
    });
    revalidatePath('/room-stays');
    return { success: true, message: 'Check-in cancelled' };
  } catch (e) {
    return failure(e);
  }
}
