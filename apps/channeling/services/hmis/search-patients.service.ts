import {
  getHmisFhirConfig,
  HmisFhirError,
  searchHmisFhirPatients,
} from "@/lib/hmis/fhir-patient-client"
import { mapFhirBundleToHmisResults } from "@/lib/hmis/map-fhir-patient"
import type {
  HmisPatientSearchParams,
  HmisPatientSearchServiceResult,
} from "@/types/hmis-patient"

const MAX_RESULTS = 50

export async function searchHmisPatientsService(
  params: HmisPatientSearchParams
): Promise<HmisPatientSearchServiceResult> {
  if (!getHmisFhirConfig()) {
    return {
      success: false,
      message: "HMIS not configured (set HMIS_FHIR_BASE_URL and HMIS_FHIR_API_KEY)",
    }
  }

  const name = params.name?.trim() || undefined
  const phone = params.phone?.trim() || undefined
  const identifier = params.identifier?.trim() || undefined

  if (!name && !phone && !identifier) {
    return {
      success: false,
      message: "Enter a name, phone, or identifier (NIC / PHN / MRN) to search",
    }
  }

  try {
    const body = await searchHmisFhirPatients({ name, phone, identifier })
    const results = mapFhirBundleToHmisResults(body).slice(0, MAX_RESULTS)
    return { success: true, data: results }
  } catch (err) {
    const message =
      err instanceof HmisFhirError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to search HMIS patients"
    return { success: false, message }
  }
}
