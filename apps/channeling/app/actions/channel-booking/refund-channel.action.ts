"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { refundChannelService } from "@/services/channel-booking/refund-channel.service"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"

const refundChannelSchema = z
  .object({
    booking_id: z.string().min(1),
    refund_type: z.number().int().min(0).max(1),
    professional_fee: z.number().min(0),
    hospital_fee: z.number().min(0),
    refund_to: z.number().int().min(0).optional(),
    payment_lines: z.array(
      z.object({
        payment_method: z.number().int().min(0),
        amount: z.number().positive(),
        bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
        slip_ref: z.string().optional(),
        slip_date: z.string().optional(),
        card: z.string().optional(),
      })
    ).optional(),
    remarks: z
      .string()
      .min(1, "Remarks are required")
      .refine((s) => s.trim().length > 0, "Remarks are required"),
  })
  .superRefine((data, ctx) => {
    if (data.refund_type === 1 && data.professional_fee > 0 && data.hospital_fee > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Refund only one fee at a time: professional or hospital, not both.",
        path: ["hospital_fee"],
      })
    }
    if (data.refund_type === 0 && data.refund_to === SAVE_PAYMENT_TYPE_MIXED) {
      const lines = data.payment_lines ?? []
      if (lines.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payment_lines"],
          message: "At least two payment lines are required for mixed refunds.",
        })
        return
      }
      const allowed = new Set([
        SAVE_PAYMENT_TYPE_CASH,
        SAVE_PAYMENT_TYPE_CREDIT_CARD,
        SAVE_PAYMENT_TYPE_SLIP,
        SAVE_PAYMENT_TYPE_E_WALLET,
      ])
      lines.forEach((line, idx) => {
        if (!allowed.has(line.payment_method)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "payment_method"],
            message: "Mixed refund lines only support Cash, Credit Card, Slip, and E-Wallet.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD &&
          !line.bank?.id?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "bank"],
            message: "Bank is required for card refund lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD &&
          !line.card?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "card"],
            message: "Card reference is required for card refund lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_SLIP &&
          !line.bank?.id?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "bank"],
            message: "Bank is required for slip refund lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_SLIP &&
          !line.slip_ref?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "slip_ref"],
            message: "Slip reference is required for slip refund lines.",
          })
        }
      })
    }
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
