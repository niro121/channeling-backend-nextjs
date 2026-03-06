"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { refundChannelService } from "@/services/channel-booking/refund-channel.service"

const refundChannelSchema = z.object({
  booking_id: z.string().min(1),
  refund_type: z.number().int().min(0).max(1),
  professional_fee: z.number().min(0),
  hospital_fee: z.number().min(0),
  refund_to: z.number().int().min(0).optional(),
  remarks: z
    .string()
    .min(1, "Remarks are required")
    .refine((s) => s.trim().length > 0, "Remarks are required"),
})

export type RefundChannelActionInput = z.infer<typeof refundChannelSchema>

export type RefundChannelResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: string; message: string }

export async function refundChannelAction(
  raw: unknown
): Promise<RefundChannelResult> {
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

  const parsed = refundChannelSchema.safeParse(raw)
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

  return refundChannelService(parsed.data, userId)
}
