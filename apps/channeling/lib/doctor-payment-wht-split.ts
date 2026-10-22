/** Booking fields used to decide which channels land on the WHT receipt. */
export type WhtSplitBooking = {
  id: string
  paymentRs: number
  sessionDateMs: number
  sessionStartMs: number
  appointmentNo: number
}

export function sortDoctorPaymentBookings<T extends WhtSplitBooking>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      a.sessionDateMs - b.sessionDateMs ||
      a.sessionStartMs - b.sessionStartMs ||
      a.appointmentNo - b.appointmentNo ||
      a.id.localeCompare(b.id)
  )
}

/** How many of `count` bookings are paid with WHT. Uses the doctor's percentage, not the tax rate. */
export function whtBookingCount(count: number, sharePercent: number): number {
  if (count <= 0) return 0
  const share = Math.max(0, Math.min(100, Number(sharePercent) || 0))
  if (share <= 0) return 0
  return Math.min(count, Math.round((count * share) / 100))
}

export function planDoctorPaymentWhtSplit<T extends WhtSplitBooking>(rows: T[], sharePercent: number) {
  const sorted = sortDoctorPaymentBookings(rows)
  const whtCount = whtBookingCount(sorted.length, sharePercent)
  return {
    whtCount,
    wht: sorted.slice(0, whtCount),
    rest: sorted.slice(whtCount),
  }
}
