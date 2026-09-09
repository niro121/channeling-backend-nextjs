"use server"

import { getDoctorsForChannelBookingService } from "@/services/channel-booking"

export type GetDoctorsForChannelBookingResult = Awaited<
  ReturnType<typeof getDoctorsForChannelBookingService>
>

/** Get all doctors for channel-booking (e.g. doctor selection). */
export async function getDoctorsForChannelBooking(): Promise<GetDoctorsForChannelBookingResult> {
  try {
    return await getDoctorsForChannelBookingService()
  } catch (error: unknown) {
    console.error("getDoctorsForChannelBooking error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch doctors"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
