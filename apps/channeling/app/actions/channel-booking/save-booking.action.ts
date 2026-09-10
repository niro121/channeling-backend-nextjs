"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import prisma from "@/lib/prisma"
import { isSessionDoctorDeparted } from "@/lib/channel-room/is-session-doctor-arrived"
import { saveBookingService } from "@/services/channel-booking/save-booking.service"
import type { SaveBookingInput, SaveBookingResult } from "@/types/save-booking"
import {
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"

const saveBookingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  sex: z.string().min(1, "Sex is required"),
  phone: z.string().min(1, "Phone is required"),
  area: z.object({ id: z.string(), name: z.string() }),
  remarks: z.string().optional().default(""),
  foriegner: z.boolean(),
  payment_method: z.number().int().min(0),
  payment_type: z.number().int().min(0),
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
  session: z.object({ id: z.string() }),
  doctor: z.object({
    id: z.string(),
    title: z.string().optional(),
    name: z.string().optional(),
  }),
  amount: z.number().min(0),
  discount: z.number().min(0),
  auto_discount_type: z.string().optional(),
  discount_type: z.string().optional(),
  voucher_code: z.string().optional(),
  agency: z.object({ id: z.string() }).optional().nullable(),
  agency_book_id: z.string().optional(),
  agency_leaf: z.string().optional(),
  agency_ref: z.string().optional(),
  credit_customer: z.object({ id: z.string() }).optional().nullable(),
  bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
  slip_ref: z.string().optional(),
  slip_date: z.string().optional(),
  card: z.string().optional(),
  ewallet_ref: z.string().optional(),
  staff: z
    .object({ id: z.string(), working_department: z.string().optional() })
    .optional()
    .nullable(),
  referred_doctor: z.object({ id: z.string() }).optional().nullable(),
  referred_agency: z.object({ id: z.string() }).optional().nullable(),
  referred_staff: z.object({ id: z.string() }).optional().nullable(),
  forcedAppointmentNo: z.number().int().optional(),
  forceAppointmentNo: z.boolean().optional(),
  hmisPatientId: z.string().optional().nullable(),
  hmisMrn: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.payment_type === SAVE_PAYMENT_TYPE_E_WALLET && !data.ewallet_ref?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ewallet_ref"],
      message: "E-wallet reference is required for E-wallet payment.",
    })
  }

  if (data.payment_type === SAVE_PAYMENT_TYPE_SLIP) {
    if (!data.bank?.id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bank"],
        message: "Bank is required for Slip payment.",
      })
    }
    if (!data.slip_ref?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slip_ref"],
        message: "Slip reference is required for Slip payment.",
      })
    }
    if (!data.slip_date?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(data.slip_date.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slip_date"],
        message: "Slip date is required for Slip payment.",
      })
    }
  }

  if (data.payment_type !== SAVE_PAYMENT_TYPE_MIXED) return
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
  let total = 0
  lines.forEach((line, idx) => {
    total += line.amount
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
  if (Math.round(total * 100) !== Math.round(data.amount * 100)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["payment_lines"],
      message: "Mixed payment line total must match amount.",
    })
  }
})

export type SaveBookingActionInput = z.infer<typeof saveBookingSchema>

/**
 * Save booking action: auth, Zod validation, then service.
 * Returns consistent { success, data?, errorCode?, message? }.
 */
export async function saveBookingAction(
  raw: unknown
): Promise<SaveBookingResult> {
  try {
    await requirePermission("channel-booking", "add")
  } catch {
    return {
      success: false,
      errorCode: "FORBIDDEN",
      message: "Permission denied",
    }
  }

  const parsed = saveBookingSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors
    const msg = Object.entries(first)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
      .join("; ") || "Invalid input"
    return {
      success: false,
      errorCode: "INVALID_INPUT",
      message: msg,
    }
  }

  const sessionArrival = await prisma.session.findUnique({
    where: { id: parsed.data.session.id },
    select: { doctorArrivalTime: true, doctorDepatureTime: true },
  })
  if (isSessionDoctorDeparted(sessionArrival)) {
    return {
      success: false,
      errorCode: "DOCTOR_DEPARTED",
      message:
        "Doctor has departed. Doctor must arrive again before booking is allowed.",
    }
  }

  if (parsed.data.forceAppointmentNo === true) {
    try {
      await requirePermission("channel-booking-forced-booking", "view")
    } catch {
      return {
        success: false,
        errorCode: "FORBIDDEN",
        message: "Permission denied for forced booking into a blocked appointment number.",
      }
    }
  }

  const session = await fetchServerSession()
  const userId = session?.user?.id ?? null

  const input: SaveBookingInput = {
    ...parsed.data,
    area: parsed.data.area,
    session: parsed.data.session,
    doctor: parsed.data.doctor,
    agency: parsed.data.agency ?? undefined,
    credit_customer: parsed.data.credit_customer ?? undefined,
    bank: parsed.data.bank ?? undefined,
    staff: parsed.data.staff ?? undefined,
    referred_doctor: parsed.data.referred_doctor ?? undefined,
    referred_agency: parsed.data.referred_agency ?? undefined,
    referred_staff: parsed.data.referred_staff ?? undefined,
    forcedAppointmentNo: parsed.data.forcedAppointmentNo,
    forceAppointmentNo: parsed.data.forceAppointmentNo,
    hmisPatientId: parsed.data.hmisPatientId ?? undefined,
    hmisMrn: parsed.data.hmisMrn ?? undefined,
  }

  const result = await saveBookingService(input, userId)

  if (result.success) {
    if (userId) {
      const data = result.data as { id?: string; bookingId?: string; sessionId?: string } | undefined
      const bookingId = data?.id ?? data?.bookingId
      logActivityNonBlocking({
        userId,
        action: "channel-booking.booking.created",
        entityType: "Booking",
        entityId: typeof bookingId === "string" ? bookingId : undefined,
        importance: "high",
        metadata: data ? { sessionId: data.sessionId } : undefined,
      })
    }
    return { success: true, data: result.data }
  }

  return {
    success: false,
    errorCode: result.errorCode,
    message: result.message,
  }
}
