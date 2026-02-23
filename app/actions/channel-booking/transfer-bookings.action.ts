"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { transferBookingsService } from "@/services/channel-booking/transfer-bookings.service"

const transferBookingsSchema = z.object({
  bookingIds: z.array(z.string().min(1)).min(1),
  doctorId: z.string().min(1),
  sessionId: z.string().min(1),
  currentSessionId: z.string().min(1),
  remarks: z.string().min(1, "Transfer remarks are required."),
})

export type TransferBookingsActionInput = z.infer<typeof transferBookingsSchema>

export type TransferBookingsActionResult =
  | { success: true }
  | { success: false; errorCode: string; message: string }

export async function transferBookingsAction(
  raw: unknown
): Promise<TransferBookingsActionResult> {
  try {
    await requirePermission("channel-booking", "edit")
  } catch {
    return {
      success: false,
      errorCode: "forbidden",
      message: "Permission denied",
    }
  }

  const session = await fetchServerSession()
  const userId = session?.user?.id ?? null

  const parsed = transferBookingsSchema.safeParse(raw)
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors &&
      Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join("; ")
    return {
      success: false,
      errorCode: "invalid_input",
      message: msg || "Invalid input",
    }
  }

  return transferBookingsService(parsed.data, userId)
}
