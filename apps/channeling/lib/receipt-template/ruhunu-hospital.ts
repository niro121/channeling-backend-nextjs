/**
 * Ruhunu Hospital print defaults (Sails channel booking receipt).
 * Contact lines are hardcoded on the old bill; location name/address come from the branch when present.
 */
export const RUHUNU_HOSPITAL = {
  name: "Ruhunu Hospital",
  address: "Karapitiya, Galle",
  phone: "091 7694059 / 60",
  fax: "091 7694061",
  email: "info@ruhunuhospital.lk",
  web: "www.ruhunuhospital.lk",
} as const

/** Doctors that print hospital fee only (no Professional Bill), same as Sails. */
export const PROFESSIONAL_BILL_EXCLUDED_DOCTOR_CODES = ["DR0223", "DR0222"] as const

export function formatLocationAddress(location: {
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
}): string {
  return [location.addressLine1, location.addressLine2, location.city]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ")
}

export function ruhunuPhoneFaxLine(): string {
  return `Phone : ${RUHUNU_HOSPITAL.phone}`
}

/** Tel-only line used on Sails agent/ledger receipts (no fax). */
export function ruhunuTelLine(): string {
  return `Tel : ${RUHUNU_HOSPITAL.phone}`
}

export function ruhunuEmailWebLine(): string {
  return `Email : ${RUHUNU_HOSPITAL.email} | Web : ${RUHUNU_HOSPITAL.web}`
}

/** Fallback address line: "Ruhunu Hospital, Karapitiya, Galle". */
export function ruhunuHospitalAddressLine(): string {
  return `${RUHUNU_HOSPITAL.name}, ${RUHUNU_HOSPITAL.address}`
}
