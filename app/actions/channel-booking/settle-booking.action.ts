"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { settleBookingService } from "@/services/channel-booking/settle-booking.service"

const settleBookingSchema = z.object({
  booking_id: z.string().min(1),
  settle_method: z.number().int().min(0),
  discount: z.number().min(0),
  auto_discount_type: z.string().optional(),
  bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
  slip_ref: z.string().optional(),
  card: z.string().optional(),
})

export type SettleBookingActionInput = z.infer<typeof settleBookingSchema>

export type SettleBookingResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: string; message: string }

export async function settleBookingAction(
  raw: unknown
): Promise<SettleBookingResult> {
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

  const parsed = settleBookingSchema.safeParse(raw)
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

  const result = await settleBookingService(parsed.data, userId)
  if (result.success) return { success: true, data: result.data }
  return {
    success: false,
    errorCode: result.errorCode,
    message: result.message,
  }
}
