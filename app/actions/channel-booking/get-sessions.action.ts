"use server"

import { getSessionsForChannelBookingService } from "@/services/channel-booking"
import type { GetSessionsForChannelBookingResult } from "@/types/booking.dashboard"

/** Get sessions for channel booking: doctor + date, optionally by location. */
export async function getSessionsForChannelBooking(
  doctorId: string,
  date: Date,
  locationId?: string | null
): Promise<GetSessionsForChannelBookingResult> {
  try {
    return await getSessionsForChannelBookingService(doctorId, date, locationId)
  } catch (error: unknown) {
    console.error("getSessionsForChannelBooking error", error)
    const message = error instanceof Error ? error.message : "Failed to fetch sessions"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
