import { normalizeTitleForSelect, TITLE_LIST } from "@/types/title"
import type { HmisPatientSearchResult } from "@/types/hmis-patient"

type FhirIdentifier = { system?: string; value?: string }
type FhirTelecom = { system?: string; use?: string; value?: string }
type FhirHumanName = {
  text?: string
  family?: string
  given?: string[]
  prefix?: string[]
}
type FhirAddress = { text?: string }
type FhirPatient = {
  resourceType?: string
  id?: string
  active?: boolean
  identifier?: FhirIdentifier[]
  name?: FhirHumanName[]
  telecom?: FhirTelecom[]
  gender?: string
  birthDate?: string
  address?: FhirAddress[]
}
type FhirBundleEntry = { resource?: FhirPatient }
type FhirBundle = {
  resourceType?: string
  type?: string
  entry?: FhirBundleEntry[]
}

const MRN_SYSTEM = "urn:hmis:mrn"
const NIC_SYSTEM = "urn:lk:nic"
const PHN_SYSTEM = "urn:lk:phn"

function identifierValue(
  identifiers: FhirIdentifier[] | undefined,
  system: string
): string | null {
  const hit = identifiers?.find((i) => i.system === system && i.value?.trim())
  return hit?.value?.trim() ?? null
}

function displayName(name: FhirHumanName | undefined): string {
  if (!name) return ""
  if (name.text?.trim()) return name.text.trim()
  const parts = [...(name.given ?? []), name.family].filter(
    (p): p is string => !!p?.trim()
  )
  return parts.join(" ").trim()
}

function mapTitle(prefix: string | undefined): string | null {
  if (!prefix?.trim()) return null
  const normalized = normalizeTitleForSelect(prefix)
  const known = TITLE_LIST.find(
    (t) => t.name.toLowerCase() === normalized.toLowerCase()
  )
  if (known) return known.name
  // Try without trailing period / with period
  const stripped = prefix.trim().replace(/\.$/, "").toUpperCase()
  const withDot = `${stripped}.`
  const byDot = TITLE_LIST.find((t) => t.name.toUpperCase() === withDot)
  if (byDot) return byDot.name
  const byBare = TITLE_LIST.find(
    (t) => t.name.replace(/\.$/, "").toUpperCase() === stripped
  )
  return byBare?.name ?? null
}

function mapSex(gender: string | undefined): "male" | "female" | null {
  if (!gender) return null
  const g = gender.trim().toLowerCase()
  if (g === "male") return "male"
  if (g === "female") return "female"
  return null
}

/** Digits only; keep as-is for form validation (expects 10 digits). */
export function normalizePhoneDigits(value: string | undefined | null): string | null {
  if (!value?.trim()) return null
  const digits = value.replace(/\D/g, "")
  return digits || null
}

function pickPhone(telecom: FhirTelecom[] | undefined): string | null {
  if (!telecom?.length) return null
  const phones = telecom.filter(
    (t) => (!t.system || t.system === "phone") && t.value?.trim()
  )
  const mobile = phones.find((t) => t.use === "mobile")
  const home = phones.find((t) => t.use === "home")
  const any = phones[0]
  return (
    normalizePhoneDigits(mobile?.value) ??
    normalizePhoneDigits(home?.value) ??
    normalizePhoneDigits(any?.value)
  )
}

export function mapFhirPatientToHmisResult(
  patient: FhirPatient
): HmisPatientSearchResult | null {
  if (!patient.id) return null
  if (patient.active === false) return null

  const primaryName = patient.name?.[0]
  const name = displayName(primaryName)
  if (!name) return null

  return {
    id: String(patient.id),
    title: mapTitle(primaryName?.prefix?.[0]),
    name: name.toUpperCase(),
    sex: mapSex(patient.gender),
    phone: pickPhone(patient.telecom),
    mrn: identifierValue(patient.identifier, MRN_SYSTEM),
    nic: identifierValue(patient.identifier, NIC_SYSTEM),
    phn: identifierValue(patient.identifier, PHN_SYSTEM),
    birthDate: patient.birthDate?.trim() || null,
    address: patient.address?.[0]?.text?.trim() || null,
  }
}

export function mapFhirBundleToHmisResults(
  body: unknown
): HmisPatientSearchResult[] {
  if (!body || typeof body !== "object") return []

  const bundle = body as FhirBundle
  if (bundle.resourceType === "Patient") {
    const one = mapFhirPatientToHmisResult(body as FhirPatient)
    return one ? [one] : []
  }

  if (bundle.resourceType !== "Bundle" || !Array.isArray(bundle.entry)) {
    return []
  }

  const out: HmisPatientSearchResult[] = []
  for (const entry of bundle.entry) {
    const resource = entry?.resource
    if (!resource || resource.resourceType !== "Patient") continue
    const mapped = mapFhirPatientToHmisResult(resource)
    if (mapped) out.push(mapped)
  }
  return out
}
