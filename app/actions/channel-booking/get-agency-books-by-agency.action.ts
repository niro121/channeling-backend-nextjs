"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getAgencyBooksByAgencyForChannelBookingService } from "@/services/channel-booking/get-agency-books-by-agency.service"

export type GetAgencyBooksByAgencyResult = Awaited<
  ReturnType<typeof getAgencyBooksByAgencyForChannelBookingService>
>

/** Get agency books for an agency (for Agent booking type). Requires channel-booking view. */
export async function getAgencyBooksByAgencyForChannelBooking(
  agencyId: string
): Promise<GetAgencyBooksByAgencyResult> {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return {
      success: false,
      message: "Permission denied",
    }
  }
  if (!agencyId?.trim()) {
    return { success: true, data: [] }
  }
  return getAgencyBooksByAgencyForChannelBookingService(agencyId)
}
