'use server';

import {
  fetchChannelingDoctors,
  isChannelingApiConfigured,
} from '@/lib/channeling/public-api';
import type { PublicDoctor } from '@/types/channeling-doctor';

export type SearchDoctorsResult =
  | { success: true; doctors: PublicDoctor[]; configured: true }
  | { success: true; doctors: []; configured: false; message: string }
  | { success: false; message: string; configured: boolean };

export async function searchChannelingDoctorsAction(
  keyword?: string
): Promise<SearchDoctorsResult> {
  if (!isChannelingApiConfigured()) {
    return {
      success: true,
      doctors: [],
      configured: false,
      message:
        'Channeling API is not configured. Set CHANNELING_API_URL, CHANNELING_API_CLIENT_ID, and CHANNELING_API_CLIENT_SECRET.',
    };
  }

  try {
    const doctors = await fetchChannelingDoctors(keyword);
    return { success: true, doctors, configured: true };
  } catch (error) {
    return {
      success: false,
      configured: true,
      message: error instanceof Error ? error.message : 'Failed to search doctors',
    };
  }
}
