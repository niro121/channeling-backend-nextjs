"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { saveBookingService } from "@/services/channel-booking/save-booking.service"
import type { SaveBookingInput, SaveBookingResult } from "@/types/save-booking"

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
  agency: z.object({ id: z.string() }).optional().nullable(),
  agency_ref: z.string().optional(),
  bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
  slip_ref: z.string().optional(),
  card: z.string().optional(),
  staff: z
    .object({ id: z.string(), working_department: z.string().optional() })
    .optional()
    .nullable(),
  referred_doctor: z.object({ id: z.string() }).optional().nullable(),
  referred_agency: z.object({ id: z.string() }).optional().nullable(),
  referred_staff: z.object({ id: z.string() }).optional().nullable(),
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
      errorCode: "forbidden",
      message: "Permission denied",
    }
  }

  const session = await fetchServerSession()
  const userId = session?.user?.id ?? null

  const parsed = saveBookingSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors
    const msg = Object.entries(first)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
      .join("; ") || "Invalid input"
    return {
      success: false,
      errorCode: "invalid_input",
      message: msg,
    }
  }

  const input: SaveBookingInput = {
    ...parsed.data,
    area: parsed.data.area,
    session: parsed.data.session,
    doctor: parsed.data.doctor,
    agency: parsed.data.agency ?? undefined,
    bank: parsed.data.bank ?? undefined,
    staff: parsed.data.staff ?? undefined,
    referred_doctor: parsed.data.referred_doctor ?? undefined,
    referred_agency: parsed.data.referred_agency ?? undefined,
    referred_staff: parsed.data.referred_staff ?? undefined,
  }

  const result = await saveBookingService(input, userId)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    errorCode: result.errorCode,
    message: result.message,
  }
}
