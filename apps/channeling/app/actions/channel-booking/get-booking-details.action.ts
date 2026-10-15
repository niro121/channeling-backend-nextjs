"use server"

import {
  getBookingDetailsService,
  type BookingDetailsView,
} from "@/services/channel-booking/get-booking-details.service"

export type GetBookingDetailsResult = {
  success: boolean
  data?: BookingDetailsView
  message?: string
}

export async function getBookingDetails(
  bookingId: string
): Promise<GetBookingDetailsResult> {
  return getBookingDetailsService(bookingId)
}
