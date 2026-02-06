"use server"

import type { GetSessionsForChannelBookingResult } from "@/types/sessions"
import {
  getDoctorOptionsService,
  getSessionsForChannelBookingService,
} from "@/services/sessions.service"

// ==== GET SESSIONS FOR CHANNEL BOOKING ==== //
export const getSessionsForChannelBooking = async (
  doctorId: string,
  date: Date,
  locationId?: string | null
): Promise<GetSessionsForChannelBookingResult> => {
  try {
    return await getSessionsForChannelBookingService(doctorId, date, locationId)
  } catch (error: any) {
    console.error("getSessionsForChannelBooking error", error)
    return {
      success: false,
      message: error?.message ?? "Failed to fetch sessions",
      error: { message: error?.message },
    }
  }
}

// ==== GET DOCTOR OPTIONS ==== //
export const getDoctorOptions = async () => {
  try {
    const response = await getDoctorOptionsService();

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorOptions error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get doctors'
      }
    };
  }
};