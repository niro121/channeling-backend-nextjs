'use server';

import { fetchServerSession } from '@/lib/session';
import { pauseChannelingShift, resumeChannelingShift } from '@/lib/channeling/public-api';
import { getChannelingUserId } from '@/lib/location';
import { loadCashierShift } from '@/lib/dpay-shift';

export async function getMyShiftAction() {
  const session = await fetchServerSession();
  return loadCashierShift(session?.user?.id);
}

export async function pauseMyShiftAction() {
  const session = await fetchServerSession();
  const user = await getChannelingUserId(session?.user?.id);
  if (!user.success) return { success: false as const, message: user.message, shift: null };
  try {
    const shift = await pauseChannelingShift(user.channelingUserId);
    return { success: true as const, shift };
  } catch (error: unknown) {
    return {
      success: false as const,
      shift: null,
      message: error instanceof Error ? error.message : 'Could not pause the shift.',
    };
  }
}

export async function resumeMyShiftAction() {
  const session = await fetchServerSession();
  const user = await getChannelingUserId(session?.user?.id);
  if (!user.success) return { success: false as const, message: user.message, shift: null };
  try {
    const shift = await resumeChannelingShift(user.channelingUserId);
    return { success: true as const, shift };
  } catch (error: unknown) {
    return {
      success: false as const,
      shift: null,
      message: error instanceof Error ? error.message : 'Could not resume the shift.',
    };
  }
}
