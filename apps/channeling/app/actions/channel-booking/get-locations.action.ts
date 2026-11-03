"use server"

import { getLocationsForChannelBookingService } from "@/services/channel-booking"

export type GetLocationsForChannelBookingResult = Awaited<
  ReturnType<typeof getLocationsForChannelBookingService>
>

/** Get all locations for channel-booking (e.g. branch dropdown). */
export async function getLocationsForChannelBooking(): Promise<GetLocationsForChannelBookingResult> {
  try {
    return await getLocationsForChannelBookingService()
  } catch (error: unknown) {
    console.error("getLocationsForChannelBooking error", error)
    const message = error instanceof Error ? error.message : "Failed to fetch locations"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
