"use server"

import { getSpecialitiesForChannelBookingService } from "@/services/channel-booking"

export type GetSpecialitiesForChannelBookingResult = Awaited<
  ReturnType<typeof getSpecialitiesForChannelBookingService>
>

/** Get all specialities for channel-booking (e.g. speciality filter in doctor selection). */
export async function getSpecialitiesForChannelBooking(): Promise<GetSpecialitiesForChannelBookingResult> {
  try {
    return await getSpecialitiesForChannelBookingService()
  } catch (error: unknown) {
    console.error("getSpecialitiesForChannelBooking error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch specialities"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
