'use server';

import { revalidatePath } from 'next/cache';
import { fetchServerSession } from '@/lib/session';
import { checkPermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { roomStaysCan } from '@/lib/room-checklist-access';
import { userTypes } from '@/lib/roles';
import { RoomAyuError, reissueRoomCode, updateRoomRequestStatus } from '@/services/room-ayu.service';
import { updateConcernStatus } from '@/services/room-concerns.service';
import type { RoomConversation, RoomRequestRow, RoomRequestStatus } from '@/types/room-request';
import type { Permissions } from '@/types/user-group';

type Result<T = undefined> = { success: boolean; message?: string; data?: T };

function failure(e: unknown): Result<never> {
  if (e instanceof RoomAyuError) return { success: false, message: e.message };
  console.error('[room-ayu] action failed', e);
  return { success: false, message: 'Something went wrong. Please try again.' };
}

/** New QR code for a room; stickers already printed for it stop working. Needs Rooms → Edit. */
export async function reissueRoomCodeAction(roomId: string): Promise<Result<{ code: string }>> {
  try {
    const session = await fetchServerSession();
    const userId = session?.user?.id;
    if (!userId) throw new RoomAyuError('Please sign in again.');
    if (!(await checkPermission('rooms', 'edit'))) throw new RoomAyuError("You don't have permission to change room codes.");
    const code = await reissueRoomCode(roomId, userId);
    logActivityNonBlocking({ userId, action: 'roomAyu.codeReissued', entityType: 'Room', entityId: roomId, importance: 'medium' });
    revalidatePath('/room-qr');
    return { success: true, data: { code }, message: 'New code made. Print and replace the sticker.' };
  } catch (e) {
    return failure(e);
  }
}

/** A GRO (check-in or check-out privilege) moves a patient request along, from the web stay page. */
export async function updateRoomRequestStatusAction(id: string, status: RoomRequestStatus): Promise<Result<RoomRequestRow>> {
  try {
    const session = await fetchServerSession();
    const userId = session?.user?.id;
    if (!userId) throw new RoomAyuError('Please sign in again.');
    const can = roomStaysCan((session.user?.permissions ?? null) as Permissions | null, session.user?.userType === userTypes.admin);
    if (!can.checkIn && !can.checkOut) throw new RoomAyuError("You don't have permission to handle patient requests.");
    const r = await updateRoomRequestStatus(id, { status }, { id: userId, name: session.user?.name ?? null });
    logActivityNonBlocking({ userId, action: 'roomStays.requestUpdated', entityType: 'RoomRequest', entityId: id, importance: 'low', metadata: { status, source: 'web' } });
    revalidatePath(`/room-stays/${r.stayId}`);
    return { success: true, data: r.request };
  } catch (e) {
    return failure(e);
  }
}

/**
 * The stay's in-room chats with Inward Ayu, for the web stay page. Needs Room Check-in / Check-out →
 * view; read from Ayu with channeling's own key (Ayu's /inward route opens for that key only).
 */
export async function getStayConversationsAction(stayId: string): Promise<Result<RoomConversation[]>> {
  try {
    const session = await fetchServerSession();
    if (!session?.user?.id) throw new RoomAyuError('Please sign in again.');
    const can = roomStaysCan((session.user?.permissions ?? null) as Permissions | null, session.user?.userType === userTypes.admin);
    if (!can.view) throw new RoomAyuError("You don't have permission to see room stays.");
    if (!/^[a-f0-9]{24}$/i.test(stayId)) throw new RoomAyuError('Invalid stay.');
    const base = process.env.AYU_ADK_URL?.trim().replace(/\/+$/, '');
    const key = process.env.AYU_SERVICE_KEY?.trim();
    if (!base || !key) return { success: false, message: 'Ayu is not connected (AYU_ADK_URL / AYU_SERVICE_KEY).' };
    const res = await fetch(`${base}/inward/stays/${stayId}/conversations`, {
      headers: { 'X-Service-Key': key },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { success: false, message: `Couldn't load the conversations (Ayu answered ${res.status}).` };
    const data = (await res.json()) as { conversations?: RoomConversation[] };
    return { success: true, data: data.conversations ?? [] };
  } catch (e) {
    if (e instanceof RoomAyuError) return { success: false, message: e.message };
    return { success: false, message: "Couldn't reach Ayu for the conversations." };
  }
}

/** A GRO (check-in or check-out privilege) picks up or resolves a concern, from the web stay page. */
export async function updateConcernStatusAction(id: string, status: 'looking' | 'resolved'): Promise<Result> {
  try {
    const session = await fetchServerSession();
    const userId = session?.user?.id;
    if (!userId) throw new RoomAyuError('Please sign in again.');
    const can = roomStaysCan((session.user?.permissions ?? null) as Permissions | null, session.user?.userType === userTypes.admin);
    if (!can.checkIn && !can.checkOut) throw new RoomAyuError("You don't have permission to handle patient concerns.");
    const r = await updateConcernStatus(id, { status }, { id: userId, name: session.user?.name ?? null });
    logActivityNonBlocking({ userId, action: 'roomStays.concernUpdated', entityType: 'RoomConcern', entityId: id, importance: 'medium', metadata: { status, source: 'web' } });
    revalidatePath(`/room-stays/${r.stayId}`);
    return { success: true, message: status === 'resolved' ? 'Concern resolved' : 'Marked as looking into it' };
  } catch (e) {
    return failure(e);
  }
}
