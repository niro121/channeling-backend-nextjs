/**
 * Parse `paid` on POST /api/public/bookings.
 * Default: true (settled / receipt created). Use false or "no" for pending agent booking.
 */
export function parsePublicApiPaidParam(
  value: unknown
): { ok: true; paid: boolean } | { ok: false; message: string } {
  if (value === undefined || value === null) {
    return { ok: true, paid: true }
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
