"use server"

import { getBookingsBySessionService } from "@/services/channel-booking/get-bookings-by-session.service"

export type GetBookingsBySessionResult = Awaited<
  ReturnType<typeof getBookingsBySessionService>
>

/** Get all bookings for a session (for the Bookings panel). */
export async function getBookingsBySession(
  sessionId: string
): Promise<GetBookingsBySessionResult> {
  try {
    return await getBookingsBySessionService(sessionId)
  } catch (error: unknown) {
    console.error("getBookingsBySession error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch bookings"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
