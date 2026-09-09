"use server"

import {
  getSessionsForChannelBookingService,
  getSessionByIdForChannelBookingService,
} from "@/services/channel-booking"
import type { GetSessionsForChannelBookingResult } from "@/types/booking.dashboard"
import type { Session } from "@/types/booking.dashboard"

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

/** Get a single session by id for channel booking (e.g. when opening a booking from search). */
export async function getSessionByIdForChannelBooking(
  sessionId: string
): Promise<{ success: boolean; data?: Session | null; message?: string; error?: { message?: string } }> {
  try {
    return await getSessionByIdForChannelBookingService(sessionId)
  } catch (error: unknown) {
    console.error("getSessionByIdForChannelBooking error", error)
    const message = error instanceof Error ? error.message : "Failed to fetch session"
    return { success: false, message, error: { message } }
  }
}
