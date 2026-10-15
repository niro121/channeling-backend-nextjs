"use server"

import { getPreviousSessionTransferStatus } from "./helpers"

export type SessionTransferEligibility = {
  sessionId: string
  /** True if transfer is allowed (no previous, or previous is full). */
  canTransfer: boolean
  /** When canTransfer is false: label for the previous session (date and time) to show in UI. */
  previousSessionLabel?: string
}

export type GetSessionsTransferEligibilityResult = {
  success: boolean
  data?: SessionTransferEligibility[]
  message?: string
}

/**
 * For each session, check if it has a previous consecutive session that must be filled first.
 * Uses getPreviousSessionTransferStatus helper; returns canTransfer and optional previousSessionLabel per session.
 */
export async function getSessionsTransferEligibilityService(
  sessionIds: string[]
): Promise<GetSessionsTransferEligibilityResult> {
  if (sessionIds.length === 0) {
    return { success: true, data: [] }
  }

  try {
    const results = await Promise.all(
      sessionIds.map(async (id) => {
        const status = await getPreviousSessionTransferStatus(id)
        return {
          sessionId: id,
          canTransfer: status.canTransfer,
          previousSessionLabel: status.previousSessionLabel,
        }
      })
    )
    return { success: true, data: results }
  } catch (e) {
    console.error("getSessionsTransferEligibilityService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to check session eligibility.",
    }
  }
}
