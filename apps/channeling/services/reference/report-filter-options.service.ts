"use server"

import { getReferenceData } from "@/app/actions/reference/get-reference-data.action"
import type { ReferenceSelectOption } from "@/types/reference"

type BasicOption = { id: string; name: string }

function withAllOption(options: BasicOption[], label: string): BasicOption[] {
  const seen = new Set<string>()
  const out: BasicOption[] = [{ id: "__all__", name: label }]
  for (const o of options) {
    if (!o?.id || seen.has(o.id)) continue
    seen.add(o.id)
    out.push({ id: o.id, name: o.name })
  }
  return out
}

function mapRef(list: ReferenceSelectOption[] | undefined): BasicOption[] {
  return (list ?? []).map((x) => ({ id: x.id, name: x.name }))
}

/**
 * Single place to build consistent report filter options for common entities.
 * Uses reference-data.service (alphabetical, "Name (CODE)" labels).
 */
export async function getReportFilterOptions(params: {
  doctors?: boolean
  locations?: boolean
  agencies?: boolean
  staff?: boolean
  departments?: boolean
  specialities?: boolean
  areas?: boolean
  banks?: boolean
  allLabels?: Partial<{
    doctors: string
    locations: string
    agencies: string
    staff: string
    departments: string
    specialities: string
    areas: string
    banks: string
  }>
}): Promise<{
  success: boolean
  doctorOptions?: BasicOption[]
  locationOptions?: BasicOption[]
  agencyOptions?: BasicOption[]
  staffOptions?: BasicOption[]
  departmentOptions?: BasicOption[]
  specialityOptions?: BasicOption[]
  areaOptions?: BasicOption[]
  bankOptions?: BasicOption[]
  message?: string
}> {
  const ref = await getReferenceData({
    doctors: params.doctors,
    locations: params.locations,
    agencies: params.agencies,
    staff: params.staff,
    departments: params.departments,
    specialities: params.specialities,
    areas: params.areas,
    banks: params.banks,
  })
  if (!ref.success) {
    return { success: false, message: ref.message ?? "Failed to load reference data" }
  }

  return {
    success: true,
    ...(params.doctors && {
      doctorOptions: withAllOption(mapRef(ref.doctors), params.allLabels?.doctors ?? "All Doctors"),
    }),
    ...(params.locations && {
      locationOptions: withAllOption(
        mapRef(ref.locations),
        params.allLabels?.locations ?? "All Branches"
      ),
    }),
    ...(params.agencies && {
      agencyOptions: withAllOption(mapRef(ref.agencies), params.allLabels?.agencies ?? "All Agents"),
    }),
    ...(params.staff && {
      staffOptions: withAllOption(mapRef(ref.staff), params.allLabels?.staff ?? "All Staff"),
    }),
    ...(params.departments && {
      departmentOptions: withAllOption(
        mapRef(ref.departments),
        params.allLabels?.departments ?? "All Departments"
      ),
    }),
    ...(params.specialities && {
      specialityOptions: withAllOption(
        mapRef(ref.specialities),
        params.allLabels?.specialities ?? "All Specialities"
      ),
    }),
    ...(params.areas && {
      areaOptions: withAllOption(mapRef(ref.areas), params.allLabels?.areas ?? "All Areas"),
    }),
    ...(params.banks && {
      bankOptions: withAllOption(mapRef(ref.banks), params.allLabels?.banks ?? "All Banks"),
    }),
  }
}

