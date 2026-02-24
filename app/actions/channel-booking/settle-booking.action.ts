"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { settleBookingService } from "@/services/channel-booking/settle-booking.service"

const settleBookingSchema = z
  .object({
    booking_id: z.string().min(1),
    settle_method: z.number().int().min(0),
    discount: z.number().min(0),
    auto_discount_type: z.string().optional(),
    bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
    slip_ref: z.string().optional(),
    card: z.string().optional(),
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
