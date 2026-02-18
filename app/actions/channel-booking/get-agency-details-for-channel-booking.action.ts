"use server"

import { getAgencyDetailsForChannelBookingService } from "@/services/channel-booking/get-agency-details-for-channel-booking.service"

export type GetAgencyDetailsForChannelBookingResult = Awaited<
  ReturnType<typeof getAgencyDetailsForChannelBookingService>
>

export async function getAgencyDetailsForChannelBooking(
  agencyId: unknown
): Promise<GetAgencyDetailsForChannelBookingResult> {
  try {
    const id = typeof agencyId === "string" ? agencyId.trim() : ""
    if (!id) {
      return { success: false, message: "Agency ID is required." }
    }
    return await getAgencyDetailsForChannelBookingService(id)
  } catch (error) {
    console.error("getAgencyDetailsForChannelBooking action error", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch agency details.",
    }
  }
}
