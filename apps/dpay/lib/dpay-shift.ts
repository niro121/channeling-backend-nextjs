import {
  fetchChannelingShift,
  postChannelingDpayJournal,
  type ChannelingCashierShift,
  type DpayJournalShare,
} from '@/lib/channeling/public-api';
import { getChannelingUserId } from '@/lib/location';

export type ActiveShift = {
  channelingUserId: string;
  shiftId: string;
  shift: ChannelingCashierShift;
};

const NO_SHIFT = 'Start your shift in Channeling before you continue.';
const PAUSED = 'Your shift is paused. Resume it before you continue.';

export async function requireActiveShift(
  authUserId: string | null | undefined
): Promise<{ success: true; shift: ActiveShift } | { success: false; message: string }> {
  const user = await getChannelingUserId(authUserId);
  if (!user.success) return user;

  let shift: ChannelingCashierShift | null;
  try {
    shift = await fetchChannelingShift(user.channelingUserId);
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not load the Channeling shift.',
    };
  }

  if (!shift) return { success: false, message: NO_SHIFT };
  if (shift.expired || shift.statusLabel === 'handover_pending') {
    return { success: false, message: 'This shift has to be ended in Channeling.' };
  }
  if (shift.statusLabel !== 'active') return { success: false, message: PAUSED };

  return {
    success: true,
    shift: { channelingUserId: user.channelingUserId, shiftId: shift.id, shift },
  };
}

export async function loadCashierShift(authUserId: string | null | undefined) {
  const user = await getChannelingUserId(authUserId);
  if (!user.success) return { success: false as const, message: user.message, shift: null };
  try {
    const shift = await fetchChannelingShift(user.channelingUserId);
    return { success: true as const, shift, channelingUserId: user.channelingUserId };
  } catch (error: unknown) {
    return {
      success: false as const,
      shift: null,
      message: error instanceof Error ? error.message : 'Could not load the Channeling shift.',
    };
  }
}

export async function postTillJournal(input: {
  shift: ActiveShift;
  kind: 'patient_payment' | 'patient_refund' | 'doctor_payment' | 'doctor_payment_cancel';
  referenceId?: string | null;
  description: string;
  paymentMethod: number;
  shares: DpayJournalShare[];
  whtAmount?: number;
}): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await postChannelingDpayJournal({
      userId: input.shift.channelingUserId,
      shiftId: input.shift.shiftId,
      kind: input.kind,
      referenceId: input.referenceId,
      description: input.description,
      paymentMethod: input.paymentMethod,
      shares: input.shares,
      whtAmount: input.whtAmount,
    });
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Could not post the till journal.',
    };
  }
}
