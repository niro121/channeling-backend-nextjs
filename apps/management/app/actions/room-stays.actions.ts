'use server';

import { channelingUserJson, ChannelingUserApiError } from '@/lib/channeling-user-api';
import type {
  ChecklistAnswer,
  ChecklistForm,
  ChecklistKind,
  StayContactInput,
  StayDetailData,
  StayPatientInput,
  StayRoomsData,
  StayStats,
  StaysResult,
  SubmissionIssue
} from '@/types/room-stays';

/**
 * Patient check-in / check-out for the management app. Every call goes to channeling as the
 * signed-in user; channeling checks the room-stays privileges and runs the checklist rules.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function failure(error: unknown): { success: false; errorCode: string; message: string } {
  if (error instanceof ChannelingUserApiError) {
    return { success: false, errorCode: error.status === 401 ? 'unauthorized' : 'unavailable', message: error.message };
  }
  console.error('[management room-stays]', error);
  return { success: false, errorCode: 'unavailable', message: 'Could not reach channeling. Please try again.' };
}

const invalid = (message: string) => ({ success: false as const, errorCode: 'invalid_input', message });

export async function getStayRoomsAction(locationId: string | null): Promise<StaysResult<StayRoomsData>> {
  const qs = locationId && OBJECT_ID.test(locationId) ? `?locationId=${locationId}` : '';
  try {
    return await channelingUserJson(`/api/management/room-stays${qs}`);
  } catch (error) {
    return failure(error);
  }
}

export async function getChecklistFormAction(input: {
  roomId: string;
  kind: ChecklistKind;
  stayId?: string | null;
}): Promise<StaysResult<ChecklistForm>> {
  if (!OBJECT_ID.test(input.roomId ?? '')) return invalid('Invalid room.');
  const qs = new URLSearchParams({ roomId: input.roomId, kind: input.kind });
  if (input.stayId && OBJECT_ID.test(input.stayId)) qs.set('stayId', input.stayId);
  try {
    return await channelingUserJson(`/api/management/room-stays/form?${qs}`);
  } catch (error) {
    return failure(error);
  }
}

export async function getStayAction(stayId: string): Promise<StaysResult<StayDetailData>> {
  if (!OBJECT_ID.test(stayId ?? '')) return invalid('Invalid stay.');
  try {
    return await channelingUserJson(`/api/management/room-stays/${stayId}`);
  } catch (error) {
    return failure(error);
  }
}

export async function checkInAction(input: {
  roomId: string;
  patient: StayPatientInput;
  answers: ChecklistAnswer[];
  overrideReason?: string | null;
}): Promise<StaysResult<{ stayId: string; issues: SubmissionIssue[] }>> {
  if (!OBJECT_ID.test(input.roomId ?? '')) return invalid('Invalid room.');
  try {
    return await channelingUserJson(`/api/management/room-stays`, { method: 'POST', body: JSON.stringify(input) });
  } catch (error) {
    return failure(error);
  }
}

export async function checkOutAction(input: {
  stayId: string;
  answers: ChecklistAnswer[];
  overrideReason?: string | null;
}): Promise<StaysResult<{ stayId: string; issues: SubmissionIssue[] }>> {
  if (!OBJECT_ID.test(input.stayId ?? '')) return invalid('Invalid stay.');
  try {
    return await channelingUserJson(`/api/management/room-stays/${input.stayId}/check-out`, {
      method: 'POST',
      body: JSON.stringify({ answers: input.answers, overrideReason: input.overrideReason ?? null })
    });
  } catch (error) {
    return failure(error);
  }
}

export async function updateContactsAction(input: {
  stayId: string;
  patientPhone: string | null;
  primaryIsPatient: boolean;
  contacts: StayContactInput[];
}): Promise<StaysResult<{ count: number }>> {
  if (!OBJECT_ID.test(input.stayId ?? '')) return invalid('Invalid stay.');
  const { stayId, ...body } = input;
  try {
    return await channelingUserJson(`/api/management/room-stays/${stayId}/contacts`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  } catch (error) {
    return failure(error);
  }
}

export async function cancelStayAction(input: { stayId: string; reason: string }): Promise<StaysResult<{ roomNumber: string }>> {
  if (!OBJECT_ID.test(input.stayId ?? '')) return invalid('Invalid stay.');
  try {
    return await channelingUserJson(`/api/management/room-stays/${input.stayId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: input.reason })
    });
  } catch (error) {
    return failure(error);
  }
}

export async function getStayStatsAction(input: { locationId: string | null; days: 1 | 7 | 30 }): Promise<StaysResult<StayStats>> {
  const qs = new URLSearchParams({ days: String(input.days) });
  if (input.locationId && OBJECT_ID.test(input.locationId)) qs.set('locationId', input.locationId);
  try {
    return await channelingUserJson(`/api/management/room-stays/stats?${qs}`);
  } catch (error) {
    return failure(error);
  }
}
