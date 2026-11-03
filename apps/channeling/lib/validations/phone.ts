/**
 * Sri Lankan mobile number validation.
 * Accepts: 07XXXXXXXX (10 digits), +947XXXXXXXX, or 947XXXXXXXX.
 */
export const MOBILE_REGEX = /^(\+94|94|0)?7[0-9]{8}$/

export const MOBILE_VALIDATION_MESSAGE =
  "Enter a valid mobile number (e.g. 07XXXXXXXX or +947XXXXXXXX)"

export function normalizeMobile(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null
  const trimmed = value.trim().replace(/\s/g, "")
  return trimmed === "" ? null : trimmed
}

export function isValidMobile(value: string | null | undefined): boolean {
  const v = normalizeMobile(value)
  return v !== null && MOBILE_REGEX.test(v)
}
