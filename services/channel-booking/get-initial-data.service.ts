"use server"

import { getAllAgenciesOptionsService } from "@/services/agency.service"
import { getSpecialitiesForChannelBookingService } from "./get-specialities.service"
import { getDoctorsForChannelBookingService } from "./get-doctors.service"
import { getLocationsForChannelBookingService } from "./get-locations.service"
import { getAreasForChannelBookingService } from "./get-areas.service"
import { getDiscountsForBookingService } from "./get-discounts-for-booking.service"
import { getBanksForChannelBookingService } from "./get-banks.service"
import { getStaffOptionsForChannelBookingService } from "./get-staff-options.service"
import type { ChannelBookingSpecialityOption } from "./get-specialities.service"
import type { ChannelBookingDoctorOption } from "./get-doctors.service"
import type { ChannelBookingLocationOption } from "./get-locations.service"
import type { ChannelBookingAreaOption } from "./get-areas.service"
import type { GetDiscountsForBookingPayload } from "./get-discounts-for-booking.service"
import type { ChannelBookingBankOption } from "./get-banks.service"
import type { ChannelBookingStaffOption } from "./get-staff-options.service"

export type ChannelBookingAgencyOption = { id: string; name: string; code?: string | null }

export type ChannelBookingInitialData = {
  specialities: ChannelBookingSpecialityOption[]
  doctors: ChannelBookingDoctorOption[]
  locations: ChannelBookingLocationOption[]
  areas: ChannelBookingAreaOption[]
  discounts: GetDiscountsForBookingPayload
  agencies: ChannelBookingAgencyOption[]
  banks: ChannelBookingBankOption[]
  staffOptions: ChannelBookingStaffOption[]
  /** Current user's default preferred booking method (0–5) or null. Used to pre-select payment in New Booking Details. */
  defaultBookingMethod: number | null
  /** Current user's allowed booking location ids (from User Booking Locations). Empty = no restriction. */
  userBookingLocationIds: string[]
  /** If true, first of userBookingLocationIds (or defaultLocation) should be auto-selected in channeling. */
  userUseDefaultLocation: boolean
  /** When userUseDefaultLocation is true, this is the location id to auto-select (first booking location or saved default). */
  userDefaultLocationId: string | null
}

/**
 * Fetch specialities, doctors, locations, areas, discounts, and current user's default booking method for channel-booking.
 * Reduces POSTs on initial load.
 * @param userId - Current user id; if provided, defaultBookingMethod is loaded from user profile.
 */
export async function getChannelBookingInitialDataService(
  userId?: string | null
): Promise<{
  success: boolean
  data?: ChannelBookingInitialData
  message?: string
  error?: { message?: string }
}> {
  try {
    let defaultBookingMethod: number | null = null
    let userBookingLocationIds: string[] = []
    let userUseDefaultLocation = false
    let userDefaultLocationId: string | null = null
    if (userId) {
      const prisma = (await import("@/lib/prisma")).default
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          defaultBookingMethod: true,
          checkedDefaultLocation: true,
          defaultLocation: true,
          bookingLocations: { select: { locationId: true } },
        },
      })
      if (u?.defaultBookingMethod != null && u.defaultBookingMethod >= 0 && u.defaultBookingMethod <= 5) {
        defaultBookingMethod = u.defaultBookingMethod
      }
      const allowedIds = (u?.bookingLocations ?? []).map((b) => b.locationId).filter(Boolean)
      userBookingLocationIds = allowedIds
      userUseDefaultLocation = u?.checkedDefaultLocation ?? false
      if (userUseDefaultLocation && allowedIds.length > 0) {
        userDefaultLocationId = (u?.defaultLocation && allowedIds.includes(u.defaultLocation))
          ? u.defaultLocation
          : allowedIds[0]
      }
    }

    const start = Date.now()
    const [
      specialitiesRes,
      doctorsRes,
      locationsRes,
      areasRes,
      discountsPayload,
      banksRes,
      staffRes,
    ] = await Promise.all([
      getSpecialitiesForChannelBookingService(),
      getDoctorsForChannelBookingService(),
      getLocationsForChannelBookingService(),
      getAreasForChannelBookingService(),
      getDiscountsForBookingService(),
      getBanksForChannelBookingService(),
      getStaffOptionsForChannelBookingService(),
    ])
    let agencies: ChannelBookingAgencyOption[] = []
    try {
      const agencyRes = await getAllAgenciesOptionsService()
      agencies = (agencyRes.data ?? []).map((a: { id: string; name: string; code?: string }) => ({
        id: a.id,
        name: a.name,
        code: a.code ?? null,
      }))
    } catch (e) {
      console.warn("getChannelBookingInitialData agencies failed", e)
    }
    const ms = Date.now() - start
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `[channel-booking] getChannelBookingInitialData: ${ms}ms (specialities: ${specialitiesRes.data?.length ?? 0}, doctors: ${doctorsRes.data?.length ?? 0}, locations: ${locationsRes.data?.length ?? 0}, areas: ${areasRes.data?.length ?? 0}, discounts: ${(discountsPayload.manual?.length ?? 0) + (discountsPayload.auto?.length ?? 0)}, agencies: ${agencies.length}, banks: ${banksRes.data?.length ?? 0}, staff: ${staffRes.data?.length ?? 0})`
      )
    }

    const data: ChannelBookingInitialData = {
      specialities: specialitiesRes.success && specialitiesRes.data ? specialitiesRes.data : [],
      doctors: doctorsRes.success && doctorsRes.data ? doctorsRes.data : [],
      locations: locationsRes.success && locationsRes.data ? locationsRes.data : [],
      areas: areasRes.success && areasRes.data ? areasRes.data : [],
      discounts: discountsPayload ?? { manual: [], auto: [] },
      agencies,
      banks: banksRes.success && banksRes.data ? banksRes.data : [],
      staffOptions: staffRes.success && staffRes.data ? staffRes.data : [],
      defaultBookingMethod,
      userBookingLocationIds,
      userUseDefaultLocation,
      userDefaultLocationId,
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
