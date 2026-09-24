"use server"

import { getAreasForChannelBookingService } from "@/services/channel-booking"

export type GetAreasForChannelBookingResult = Awaited<
  ReturnType<typeof getAreasForChannelBookingService>
>

/** Get all areas (tag cities) for channel-booking (e.g. Area dropdown in booking form). */
export async function getAreasForChannelBooking(): Promise<GetAreasForChannelBookingResult> {
  try {
    return await getAreasForChannelBookingService()
  } catch (error: unknown) {
    console.error("getAreasForChannelBooking error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch areas"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
