"use server"

import {
  getSessionsTransferEligibilityService,
  type SessionTransferEligibility,
} from "@/services/channel-booking/get-sessions-transfer-eligibility.service"

export type GetSessionsTransferEligibilityResult = {
  success: boolean
  data?: SessionTransferEligibility[]
  message?: string
}

export async function getSessionsTransferEligibilityAction(
  sessionIds: string[]
): Promise<GetSessionsTransferEligibilityResult> {
  return getSessionsTransferEligibilityService(sessionIds)
}
