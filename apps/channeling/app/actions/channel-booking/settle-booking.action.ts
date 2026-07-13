"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { settleBookingService } from "@/services/channel-booking/settle-booking.service"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"

const settleBookingSchema = z
  .object({
    booking_id: z.string().min(1),
    settle_method: z.number().int().min(0),
    discount: z.number().min(0),
    auto_discount_type: z.string().optional(),
    bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
    slip_ref: z.string().optional(),
    slip_date: z.string().optional(),
    card: z.string().optional(),
    ewallet_ref: z.string().optional(),
    payment_lines: z.array(
      z.object({
        payment_method: z.number().int().min(0),
        amount: z.number().positive(),
        bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
        slip_ref: z.string().optional(),
        slip_date: z.string().optional(),
        card: z.string().optional(),
        ewallet_ref: z.string().optional(),
      })
    ).optional(),
  })
  .refine(
    async (data) => {
      const booking = await prisma.booking.findUnique({
        where: { id: data.booking_id },
        select: { session: { select: { status: true } } },
      })
      if (!booking?.session) return false
      return booking.session.status === 1
    },
    {
      message:
        "Doctor is on leave for this session. Settlement is not allowed.",
    }
  )
  .refine(
    async (data) => {
      const booking = await prisma.booking.findUnique({
        where: { id: data.booking_id },
        select: { session: { select: { date: true } } },
      })
      if (!booking?.session?.date) return true
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const sessionDate = new Date(booking.session.date)
      sessionDate.setHours(0, 0, 0, 0)
      return sessionDate >= today
    },
    {
      message:
        "Cannot settle a booking for a past session date. Only today's sessions can be settled.",
    }
  )
  .refine(
    async (data) => {
      const booking = await prisma.booking.findUnique({
        where: { id: data.booking_id },
        select: {
          session: {
            select: { doctorArrivalTime: true, doctorDepatureTime: true },
          },
        },
      })
      const session = booking?.session as
        | { doctorArrivalTime?: unknown; doctorDepatureTime?: unknown }
        | null
      if (!session) return true
      const parse = (json: unknown): { time: string }[] => {
        if (!Array.isArray(json)) return []
        return json.filter(
          (item): item is { time: string } =>
            item != null &&
            typeof item === "object" &&
            "time" in item &&
            typeof (item as { time: string }).time === "string"
        )
      }
      const arrivals = parse(session.doctorArrivalTime)
      const departures = parse(session.doctorDepatureTime)
      if (departures.length === 0) return true
      const lastDep = Math.max(
        ...departures.map((e) => parseInt(e.time, 10) || 0)
      )
      return arrivals.some((e) => (parseInt(e.time, 10) || 0) > lastDep)
    },
    {
      message:
        "Doctor has departed. Doctor must arrive again before settlement is allowed.",
    }
  )
  .superRefine((data, ctx) => {
    const bankId = data.bank?.id?.trim()

    // When settling via Slip: bank, slip reference, and slip date are mandatory.
    if (data.settle_method === SAVE_PAYMENT_TYPE_SLIP) {
      if (!bankId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bank"],
          message: "Bank is required when settling via Slip.",
        })
      }
      if (!data.slip_ref?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slip_ref"],
          message: "Slip reference is required when settling via Slip.",
        })
      }
      if (!data.slip_date?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(data.slip_date.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["slip_date"],
          message: "Slip date is required when settling via Slip.",
        })
      }
    }

    if (data.settle_method === SAVE_PAYMENT_TYPE_E_WALLET && !data.ewallet_ref?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ewallet_ref"],
        message: "E-wallet reference is required when settling via E-Wallet.",
      })
    }

    // When settling via Credit Card: both bank and card reference are mandatory.
    if (data.settle_method === SAVE_PAYMENT_TYPE_CREDIT_CARD) {
      if (!bankId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bank"],
          message: "Bank is required when settling via Credit Card.",
        })
      }
      if (!data.card?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["card"],
          message: "Card reference is required when settling via Credit Card.",
        })
      }
    }

    if (data.settle_method === SAVE_PAYMENT_TYPE_MIXED) {
      const lines = data.payment_lines ?? []
      if (lines.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payment_lines"],
          message: "At least two payment lines are required for mixed payments.",
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
            message: "Mixed payment lines only support Cash, Credit Card, Slip, and E-Wallet.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD &&
          !line.bank?.id?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "bank"],
            message: "Bank is required for card payment lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD &&
          !line.card?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "card"],
            message: "Card reference is required for card payment lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_SLIP &&
          !line.bank?.id?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "bank"],
            message: "Bank is required for slip payment lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_SLIP &&
          !line.slip_ref?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "slip_ref"],
            message: "Slip reference is required for slip payment lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_SLIP &&
          (!line.slip_date?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(line.slip_date.trim()))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "slip_date"],
            message: "Slip date is required for slip payment lines.",
          })
        }
        if (
          line.payment_method === SAVE_PAYMENT_TYPE_E_WALLET &&
          !line.ewallet_ref?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["payment_lines", idx, "ewallet_ref"],
            message: "E-wallet reference is required for e-wallet payment lines.",
          })
        }
      })
    }
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

  const parsed = await settleBookingSchema.safeParseAsync(raw)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const fieldMsg =
      parsed.error.flatten().fieldErrors &&
      Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join("; ")
    return {
      success: false,
      errorCode: "invalid_input",
      message: firstIssue?.message ?? fieldMsg ?? "Invalid input",
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
