import prisma from "@/lib/prisma"
import { getBookingForSaveBooking } from "./helpers"

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
  })

  if (!booking) {
    return { success: false, errorCode: "not_found", message: "Booking not found." }
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
  return { success: true, data }
}
