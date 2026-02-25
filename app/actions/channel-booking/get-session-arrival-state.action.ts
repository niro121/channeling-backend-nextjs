"use server"

import { requirePermission } from "@/lib/server-permissions"
import {
  getSessionArrivalStateService,
  type SessionArrivalState,
} from "@/services/channel-booking/get-session-arrival-state.service"

export type { SessionArrivalState }

export async function getSessionArrivalState(
  sessionId: string
): Promise<{ success: boolean; data?: SessionArrivalState; message?: string }> {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false, message: "Permission denied." }
  }
  if (!sessionId) return { success: false, message: "Session ID required." }
  return getSessionArrivalStateService(sessionId)
}
