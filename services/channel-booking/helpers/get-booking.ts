import prisma from "@/lib/prisma"
import { BOOKING_METHODS } from "@/types/channel-booking"
import { resolveUser } from "./resolve-user"
import { getRefundFeeTypes } from "./get-refund-fee-types"

/**
 * Spec §6.8 (minimal). Load booking by id with relations; add computed method name, createdByName, refund fee types.
 */
export async function getBookingForSaveBooking(bookingId: string): Promise<unknown> {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      session: true,
      doctor: true,
      agency: true,
      location: true,
    },
  })

  if (!b) return null

  const createdByName = await resolveUser(b.createdBy)
  const methodName =
    BOOKING_METHODS.find((m) => m.id === b.method)?.name ?? ""

  const refundFeeTypes = getRefundFeeTypes(b.fees as unknown, b.foriegner)

  return {
    ...b,
    methodName,
    createdByName,
    refund_feetypes: refundFeeTypes,
  }
}
