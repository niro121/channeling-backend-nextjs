"use server"

import { getBanksForChannelBookingService } from "@/services/channel-booking/reference/get-banks.service"

export type GetBanksForChannelBookingResult = Awaited<
  ReturnType<typeof getBanksForChannelBookingService>
>

export async function getBanksForChannelBooking(): Promise<GetBanksForChannelBookingResult> {
  try {
    return await getBanksForChannelBookingService()
  } catch (error: unknown) {
    console.error("getBanksForChannelBooking error", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch banks",
    }
  }
}
