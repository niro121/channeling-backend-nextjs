"use server"

import { getSpecialitiesForChannelBookingService } from "./get-specialities.service"
import { getDoctorsForChannelBookingService } from "./get-doctors.service"
import { getLocationsForChannelBookingService } from "./get-locations.service"
import { getAreasForChannelBookingService } from "./get-areas.service"
import { getDiscountsForBookingService } from "./get-discounts-for-booking.service"
import type { ChannelBookingSpecialityOption } from "./get-specialities.service"
import type { ChannelBookingDoctorOption } from "./get-doctors.service"
import type { ChannelBookingLocationOption } from "./get-locations.service"
import type { ChannelBookingAreaOption } from "./get-areas.service"
import type { GetDiscountsForBookingPayload } from "./get-discounts-for-booking.service"

export type ChannelBookingInitialData = {
  specialities: ChannelBookingSpecialityOption[]
  doctors: ChannelBookingDoctorOption[]
  locations: ChannelBookingLocationOption[]
  areas: ChannelBookingAreaOption[]
  discounts: GetDiscountsForBookingPayload
}

/**
 * Fetch specialities, doctors, locations, areas, and discounts for channel-booking in one round-trip.
 * Reduces POSTs on initial load.
 */
export async function getChannelBookingInitialDataService(): Promise<{
  success: boolean
  data?: ChannelBookingInitialData
  message?: string
  error?: { message?: string }
}> {
  try {
    const start = Date.now()
    const [specialitiesRes, doctorsRes, locationsRes, areasRes, discountsPayload] = await Promise.all([
      getSpecialitiesForChannelBookingService(),
      getDoctorsForChannelBookingService(),
      getLocationsForChannelBookingService(),
      getAreasForChannelBookingService(),
      getDiscountsForBookingService(),
    ])
    const ms = Date.now() - start
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[channel-booking] getChannelBookingInitialData: ${ms}ms (specialities: ${specialitiesRes.data?.length ?? 0}, doctors: ${doctorsRes.data?.length ?? 0}, locations: ${locationsRes.data?.length ?? 0}, areas: ${areasRes.data?.length ?? 0}, discounts: ${(discountsPayload.manual?.length ?? 0) + (discountsPayload.auto?.length ?? 0)})`
      )
    }

    const data: ChannelBookingInitialData = {
      specialities: specialitiesRes.success && specialitiesRes.data ? specialitiesRes.data : [],
      doctors: doctorsRes.success && doctorsRes.data ? doctorsRes.data : [],
      locations: locationsRes.success && locationsRes.data ? locationsRes.data : [],
      areas: areasRes.success && areasRes.data ? areasRes.data : [],
      discounts: discountsPayload ?? { manual: [], auto: [] },
    }
    return { success: true, data }
  } catch (error: unknown) {
    console.error("getChannelBookingInitialDataService error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch channel booking initial data"
    return {
      success: false,
      message,
      error: { message },
    }
  }
}
