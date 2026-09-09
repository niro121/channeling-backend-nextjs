"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import {
  addBlockedAppointmentNumbersService,
  removeBlockedAppointmentNumbersService,
} from "@/services/channel-booking/manage-session-appointment-blocks.service"

const sessionIdSchema = z.object({
  sessionId: z.string().min(1),
  numbers: z.array(z.number().int()).min(1),
})

export type ManageSessionAppointmentBlocksActionResult =
  | { success: true; blockedAppointmentNumbers: number[] }
  | { success: false; message: string }

export async function addBlockedAppointmentNumbersAction(
  raw: unknown
): Promise<ManageSessionAppointmentBlocksActionResult> {
  try {
    await requirePermission("channel-booking-block", "view")
  } catch {
    return { success: false, message: "Permission denied" }
  }
  const parsed = sessionIdSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: "Invalid input" }
  }
  const session = await fetchServerSession()
  const userId = session?.user?.id ?? null
  return addBlockedAppointmentNumbersService(parsed.data.sessionId, parsed.data.numbers, userId)
}

export async function removeBlockedAppointmentNumbersAction(
  raw: unknown
): Promise<ManageSessionAppointmentBlocksActionResult> {
  try {
    await requirePermission("channel-booking-block", "view")
  } catch {
    return { success: false, message: "Permission denied" }
  }
  const parsed = sessionIdSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: "Invalid input" }
  }
  const session = await fetchServerSession()
  const userId = session?.user?.id ?? null
  return removeBlockedAppointmentNumbersService(parsed.data.sessionId, parsed.data.numbers, userId)
}
