/** Mapped HMIS FHIR Patient for channel-booking autofill. */
export type HmisPatientSearchResult = {
  id: string
  title: string | null
  name: string
  sex: "male" | "female" | null
  phone: string | null
  mrn: string | null
  nic: string | null
  phn: string | null
  birthDate: string | null
  address: string | null
}

export type HmisPatientSearchParams = {
  name?: string
  phone?: string
  identifier?: string
}

export type HmisPatientSearchServiceResult =
  | { success: true; data: HmisPatientSearchResult[] }
  | { success: false; message: string }
