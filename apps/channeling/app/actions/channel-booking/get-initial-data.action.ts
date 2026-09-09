"use server"

import { fetchServerSession } from "@/lib/session"
import { getChannelBookingInitialDataService } from "@/services/channel-booking/get-initial-data.service"

export type GetChannelBookingInitialDataResult = Awaited<
  ReturnType<typeof getChannelBookingInitialDataService>
>

/** Get specialities, doctors, locations, and current user's default booking method for channel-booking in one round-trip. */
export async function getChannelBookingInitialData(): Promise<GetChannelBookingInitialDataResult> {
  try {
    const session = await fetchServerSession()
    const userId = session?.user?.id ?? null
    return await getChannelBookingInitialDataService(userId)
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
