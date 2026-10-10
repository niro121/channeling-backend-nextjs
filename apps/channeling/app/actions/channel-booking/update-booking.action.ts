"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { updateBookingService } from "@/services/channel-booking/update-booking.service"

const updateBookingSchema = z.object({
  booking_id: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  name: z.string().min(1, "Name is required"),
  sex: z.string().min(1, "Sex is required"),
  phone: z.string().min(1, "Phone is required"),
  remarks: z.string().optional(),
})

export type UpdateBookingActionInput = z.infer<typeof updateBookingSchema>

export type UpdateBookingResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: string; message: string }

export async function updateBookingAction(
  raw: unknown
): Promise<UpdateBookingResult> {
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

  const parsed = updateBookingSchema.safeParse(raw)
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

  return updateBookingService(parsed.data, userId)
}
