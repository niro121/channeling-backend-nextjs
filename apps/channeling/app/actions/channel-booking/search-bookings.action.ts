"use server"

import {
  searchBookingsService,
  type SearchBookingsParams,
  type SearchBookingsResult,
} from "@/services/channel-booking/search-bookings.service"

export type SearchBookingsActionParams = SearchBookingsParams

export type SearchBookingsActionResult = SearchBookingsResult

export async function searchBookingsAction(
  params: SearchBookingsActionParams
): Promise<SearchBookingsActionResult> {
  try {
    return await searchBookingsService(params)
  } catch (error: unknown) {
    console.error("searchBookingsAction error", error)
    const message =
      error instanceof Error ? error.message : "Failed to search bookings"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
