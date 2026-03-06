"use server"

import {
  getAgenciesForSelectService,
  getLocationsForSelectService,
  getDoctorsForSelectService,
  getStaffForSelectService,
} from "@/services/reference/reference-data.service"
import type { ReferenceSelectOption } from "@/types/reference"

export type GetReferenceDataParams = {
  agencies?: boolean
  locations?: boolean
  doctors?: boolean
  staff?: boolean
}

export type GetReferenceDataResult = {
  success: boolean
  agencies?: ReferenceSelectOption[]
  locations?: ReferenceSelectOption[]
  doctors?: ReferenceSelectOption[]
  staff?: ReferenceSelectOption[]
  message?: string
}

/** Fetch one or more reference lists for dropdowns. All lists are alphabetical by name with "Name (CODE)" label. */
export async function getReferenceData(
  params: GetReferenceDataParams = {}
): Promise<GetReferenceDataResult> {
  try {
    const { agencies: wantAgencies, locations: wantLocations, doctors: wantDoctors, staff: wantStaff } = params
    const results = await Promise.all([
      wantAgencies ? getAgenciesForSelectService() : Promise.resolve([]),
      wantLocations ? getLocationsForSelectService() : Promise.resolve([]),
      wantDoctors ? getDoctorsForSelectService() : Promise.resolve([]),
      wantStaff ? getStaffForSelectService() : Promise.resolve([]),
    ])
    return {
      success: true,
      ...(wantAgencies && { agencies: results[0] }),
      ...(wantLocations && { locations: results[1] }),
      ...(wantDoctors && { doctors: results[2] }),
      ...(wantStaff && { staff: results[3] }),
    }
  } catch (err) {
    console.error("getReferenceData error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to load reference data",
    }
  }
}

/** Agencies only — alphabetical, "Name (CODE)". */
export async function getAgenciesForSelect(): Promise<{
  success: boolean
  data: ReferenceSelectOption[]
  message?: string
}> {
  try {
    const data = await getAgenciesForSelectService()
    return { success: true, data }
  } catch (err) {
    console.error("getAgenciesForSelect error", err)
    return {
      success: false,
      data: [],
      message: err instanceof Error ? err.message : "Failed to load agencies",
    }
  }
}

/** Locations only — alphabetical, "Name (CODE)". */
export async function getLocationsForSelect(): Promise<{
  success: boolean
  data: ReferenceSelectOption[]
  message?: string
}> {
  try {
    const data = await getLocationsForSelectService()
    return { success: true, data }
  } catch (err) {
    console.error("getLocationsForSelect error", err)
    return {
      success: false,
      data: [],
      message: err instanceof Error ? err.message : "Failed to load locations",
    }
  }
}

/** Doctors only — alphabetical, "Name (CODE)". */
export async function getDoctorsForSelect(): Promise<{
  success: boolean
  data: ReferenceSelectOption[]
  message?: string
}> {
  try {
    const data = await getDoctorsForSelectService()
    return { success: true, data }
  } catch (err) {
    console.error("getDoctorsForSelect error", err)
    return {
      success: false,
      data: [],
      message: err instanceof Error ? err.message : "Failed to load doctors",
    }
  }
}

/** Staff only — alphabetical, "Name (CODE)". */
export async function getStaffForSelect(): Promise<{
  success: boolean
  data: ReferenceSelectOption[]
  message?: string
}> {
  try {
    const data = await getStaffForSelectService()
    return { success: true, data }
  } catch (err) {
    console.error("getStaffForSelect error", err)
    return {
      success: false,
      data: [],
      message: err instanceof Error ? err.message : "Failed to load staff",
    }
  }
}
