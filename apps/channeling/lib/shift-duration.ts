/**
 * Shift max duration from env.
 * Cashiers: SHIFT_MAX_DURATION_HOURS (default 36)
 * Bulk cashiers (bulk-cashier-dashboard): SHIFT_MAX_DURATION_HOURS_BULK_CASHIER
 *   (falls back to SHIFT_MAX_DURATION_HOURS, then 36)
 */

function parseHours(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function getDefaultShiftMaxHours(): number {
  return parseHours(process.env.SHIFT_MAX_DURATION_HOURS, 36)
}

export function getBulkCashierShiftMaxHours(): number {
  const cashierDefault = getDefaultShiftMaxHours()
  return parseHours(process.env.SHIFT_MAX_DURATION_HOURS_BULK_CASHIER, cashierDefault)
}

/** Resolve max hours for a user based on bulk-cashier dashboard permission. */
export function getShiftMaxHoursForRole(isBulkCashier: boolean): number {
  return isBulkCashier ? getBulkCashierShiftMaxHours() : getDefaultShiftMaxHours()
}

export function getEndsAtForHours(startedAt: Date, hours: number): Date {
  return new Date(startedAt.getTime() + hours * 60 * 60 * 1000)
}
