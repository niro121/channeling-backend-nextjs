import prisma from "@/lib/prisma"
import { getBookingForSaveBooking } from "./helpers"
import { logActivityNonBlocking } from "@/lib/activity-log"

export type UpdateBookingInput = {
  booking_id: string
  title: string
  name: string
  sex: string
  phone: string
  remarks?: string
}

export type UpdateBookingResult =
  | { success: true; data: unknown }
  | { success: false; errorCode: string; message: string }

/**
 * Update channel booking details (title, name, sex, phone, remarks).
 * Permission must be checked by caller.
 */
export async function updateBookingService(
  input: UpdateBookingInput,
  userId: string | null
): Promise<UpdateBookingResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
    include: {
      session: { select: { date: true } },
    },
  })

  if (!booking) {
    return { success: false, errorCode: "not_found", message: "Booking not found." }
  }

  const before = {
    title: booking.title ?? "",
    name: booking.name ?? "",
    sex: booking.sex ?? "",
    phone: booking.phone ?? "",
    remarks: booking.remarks ?? "",
  }

  // Past-date sessions: booking details cannot be changed (cancel/refund only).
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sessionDate = booking.session?.date ? new Date(booking.session.date) : null
  if (sessionDate) {
    sessionDate.setHours(0, 0, 0, 0)
    if (sessionDate < today) {
      return {
        success: false,
        errorCode: "past_session",
        message: "Cannot change a booking for a past session date. Only cancel or refund is allowed.",
      }
    }
  }

  await prisma.booking.update({
    where: { id: input.booking_id },
    data: {
      title: input.title.trim(),
      name: input.name.trim().toUpperCase(),
      sex: input.sex.trim(),
      phone: input.phone.trim(),
      remarks: input.remarks?.trim() ?? "",
    },
  })

  const data = await getBookingForSaveBooking(input.booking_id)

  if (userId) {
    const after = {
      title: input.title.trim(),
      name: input.name.trim().toUpperCase(),
      sex: input.sex.trim(),
      phone: input.phone.trim(),
      remarks: input.remarks?.trim() ?? "",
    }

    logActivityNonBlocking({
      userId,
      action: "booking.updated",
      entityType: "Booking",
      entityId: input.booking_id,
      importance: "high",
      metadata: {
        remarks: "Booking details updated.",
        before: JSON.stringify(before),
        after: JSON.stringify(after),
      },
    })
  }

  return { success: true, data }
}
