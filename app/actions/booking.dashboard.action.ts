'use server';

import { getSessionsForChannelBookingService } from '@/services/booking.dashboard.service';
import { GetSessionsForChannelBookingResult } from '@/types/booking.dashboard';

// ==== GET SESSIONS FOR CHANNEL BOOKING ==== //
export const getSessionsForChannelBooking = async (
  doctorId: string,
  date: Date,
  locationId?: string | null
): Promise<GetSessionsForChannelBookingResult> => {
  try {
    return await getSessionsForChannelBookingService(
      doctorId,
      date,
      locationId
    );
  } catch (error: any) {
    console.error('getSessionsForChannelBooking error', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to fetch sessions',
      error: { message: error?.message }
    };
  }
};
