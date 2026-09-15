"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getAgencyBookLeafUsageService } from "@/services/channel-booking/reference/get-agency-book-leaf-usage.service"

export type GetAgencyBookLeafUsageResult = Awaited<
  ReturnType<typeof getAgencyBookLeafUsageService>
>

/** Used vs unused leaf numbers for a selected agency book. */
export async function getAgencyBookLeafUsageForChannelBooking(
  agencyId: string,
  agencyBookId: string
): Promise<GetAgencyBookLeafUsageResult> {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false, message: "Permission denied" }
  }
  return getAgencyBookLeafUsageService(agencyId, agencyBookId)
}
