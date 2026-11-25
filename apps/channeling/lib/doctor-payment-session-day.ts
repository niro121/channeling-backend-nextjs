const COLOMBO = "Asia/Colombo"

/** Calendar day in Sri Lanka, YYYY-MM-DD. */
export function colomboTodayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/**
 * Session.date is the session's calendar day stored at UTC midnight.
 * A session later today is still today. Tomorrow and after are future.
 */
export function sessionCalendarDayKey(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function isFutureDoctorPaymentSession(date: Date, now = new Date()): boolean {
  if (Number.isNaN(new Date(date).getTime())) return false
  return sessionCalendarDayKey(date) > colomboTodayKey(now)
}
