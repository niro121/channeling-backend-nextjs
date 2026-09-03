/**
 * Parse `paid` on POST /api/public/bookings.
 * When omitted, returns `paid: undefined` so create-booking can default by session
 * (advance-booking sessions → On-Call pending; others → Agent settled).
 */
export function parsePublicApiPaidParam(
  value: unknown
): { ok: true; paid: boolean | undefined } | { ok: false; message: string } {
  if (value === undefined || value === null) {
    return { ok: true, paid: undefined }
  }
  if (typeof value === "boolean") {
    return { ok: true, paid: value }
  }
  if (typeof value === "number") {
    if (value === 0) return { ok: true, paid: false }
    if (value === 1) return { ok: true, paid: true }
    return { ok: false, message: 'paid must be yes/no, true/false, or 0/1' }
  }
  const s = String(value).trim().toLowerCase()
  if (["yes", "y", "true", "1", "paid"].includes(s)) {
    return { ok: true, paid: true }
  }
  if (["no", "n", "false", "0", "pending", "unpaid"].includes(s)) {
    return { ok: true, paid: false }
  }
  return {
    ok: false,
    message: 'paid must be yes or no (or true/false)',
  }
}
