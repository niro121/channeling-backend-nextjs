"use server"

import { getChannelBookingInitialDataService } from "@/services/channel-booking/get-initial-data.service"

export type GetChannelBookingInitialDataResult = Awaited<
  ReturnType<typeof getChannelBookingInitialDataService>
>

/** Get specialities, doctors, and locations for channel-booking in one round-trip. */
export async function getChannelBookingInitialData(): Promise<GetChannelBookingInitialDataResult> {
  try {
    return await getChannelBookingInitialDataService()
  } catch (error: unknown) {
    console.error("getChannelBookingInitialData error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch channel booking data"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
