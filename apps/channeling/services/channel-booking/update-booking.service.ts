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

type BookingDetailSnapshot = {
  title: string
  name: string
  sex: string
  phone: string
  remarks: string
}

function normalizeBookingDetails(input: {
  title: string
  name: string
  sex: string
  phone: string
  remarks?: string | null
}): BookingDetailSnapshot {
  return {
    title: input.title.trim(),
    name: input.name.trim().toUpperCase(),
    sex: input.sex.trim(),
    phone: input.phone.trim(),
    remarks: (input.remarks ?? "").trim(),
  }
}

function formatBookingDetails(details: BookingDetailSnapshot): string {
  const parts = [
    details.title || "—",
    details.name || "—",
    details.sex || "—",
    details.phone || "—",
  ]
  const base = parts.join(" · ")
  return details.remarks ? `${base} · Remarks: ${details.remarks}` : base
}

function getChangedFields(
  before: BookingDetailSnapshot,
  after: BookingDetailSnapshot
): Array<keyof BookingDetailSnapshot> {
  return (Object.keys(before) as Array<keyof BookingDetailSnapshot>).filter(
    (key) => before[key] !== after[key]
  )
}

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

  const { assertNoOpenApproval } = await import("@/services/approval-request.service")
  const openBlock = await assertNoOpenApproval(input.booking_id)
  if (openBlock) return openBlock

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

  const beforeDetails = normalizeBookingDetails({
    title: booking.title ?? "",
    name: booking.name ?? "",
    sex: booking.sex ?? "",
    phone: booking.phone ?? "",
    remarks: booking.remarks ?? "",
  })
  const afterDetails = normalizeBookingDetails({
    title: input.title,
    name: input.name,
    sex: input.sex,
    phone: input.phone,
    remarks: input.remarks,
  })
  const changedFields = getChangedFields(beforeDetails, afterDetails)

  await prisma.booking.update({
    where: { id: input.booking_id },
    data: {
      title: afterDetails.title,
      name: afterDetails.name,
      sex: afterDetails.sex,
      phone: afterDetails.phone,
      remarks: afterDetails.remarks,
    },
  })

  const data = await getBookingForSaveBooking(input.booking_id)

  if (userId && changedFields.length > 0) {
    logActivityNonBlocking({
      userId,
      action: "booking.updated",
      entityType: "Booking",
      entityId: input.booking_id,
      importance: "high",
      metadata: {
        remarks: "Booking details updated.",
        before: formatBookingDetails(beforeDetails),
        after: formatBookingDetails(afterDetails),
        changedFields,
        changes: Object.fromEntries(
          changedFields.map((field) => [
            field,
            { from: beforeDetails[field], to: afterDetails[field] },
          ])
        ),
      },
    })
  }

  return { success: true, data }
}
