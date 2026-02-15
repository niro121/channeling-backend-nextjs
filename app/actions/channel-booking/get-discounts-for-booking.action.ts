"use server"

import {
  getDiscountsForBookingService,
  type GetDiscountsForBookingPayload,
} from "@/services/channel-booking/get-discounts-for-booking.service"

export type GetDiscountsForBookingResult = {
  success: boolean
  data?: GetDiscountsForBookingPayload
  message?: string
}

/**
 * Get all manual (non–auto-apply) discounts for channel-booking.
 * Client filters by booking type; first applicable auto discount is used as auto_discount_type.
 */
export async function getDiscountsForBooking(): Promise<GetDiscountsForBookingResult> {
  try {
    const data = await getDiscountsForBookingService()
    return { success: true, data }
  } catch (error: unknown) {
    console.error("getDiscountsForBooking error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch discounts"
    return {
      success: false,
      data: { manual: [], auto: [] },
      message,
    }
  }
}
