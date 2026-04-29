import { cn, formatTimeSriLanka } from "@/lib/utils"
import type { Session } from "@/types/booking.dashboard"

const MINUTES_PER_DAY = 24 * 60

/**
 * Normalize startTime/endTime to minutes-from-midnight (0–1439).
 * Handles: (a) minutes from midnight 0–1439, (b) decimal hours e.g. 8.25 = 8:25 AM,
 * (c) Date/ISO string, (d) large numbers = minutes-from-epoch (use session date to get midnight).
 */
function toMinutesFromMidnight(
  value: number | string | Date,
  sessionDate?: Date | string
): number {
  if (typeof value === "string" || value instanceof Date) {
    const d = typeof value === "string" ? new Date(value) : value
    return d.getHours() * 60 + d.getMinutes()
  }
  const n = value as number
  // Decimal hours from template e.g. 8.25 = 8:25 AM, 10.10 = 10:10 AM
  if (n >= 0 && n < 24 && n % 1 !== 0) {
    const hours = Math.floor(n)
    const mins = Math.round((n - hours) * 100)
    return Math.min(hours * 60 + mins, MINUTES_PER_DAY - 1)
  }
  // HHmm format e.g. 825 = 8:25, 1010 = 10:10
  if (n >= 0 && n <= 2359 && Math.floor(n / 100) < 24 && n % 100 < 60) {
    return Math.floor(n / 100) * 60 + (n % 100)
  }
  // Already minutes from midnight (0–1439)
  if (n >= 0 && n < MINUTES_PER_DAY) return Math.round(n)
  // Large value: total minutes from epoch; get minutes from midnight using session date
  const dateToUse = sessionDate
    ? typeof sessionDate === "string"
      ? new Date(sessionDate)
      : sessionDate
    : new Date()
  const midnight = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate())
  const midnightMinutesEpoch = midnight.getTime() / 60000
  const minutesFromMidnight = (n - midnightMinutesEpoch) % MINUTES_PER_DAY
  return Math.round((minutesFromMidnight + MINUTES_PER_DAY) % MINUTES_PER_DAY)
}

/** Legacy: detect unix timestamp in seconds (for backward compatibility). */
function isUnixSeconds(n: number): boolean {
  return n >= 1e9 && n < 1e13
}

/** Format startTime/endTime for display. Session uses DateTime; API may send Date or ISO string. Handles legacy number (minutes or unix seconds). */
export function formatSessionTime(
  value: number | string | Date,
  sessionDate?: Date | string
): string {
  if (typeof value === "number" && isUnixSeconds(value)) {
    return formatTimeSriLanka(value)
  }
  const minutes = toMinutesFromMidnight(value, sessionDate)
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/**
 * Absolute start time of a session (same rules as `formatSessionTime` for raw `value`).
 * Use for “already started” checks; pairs with `formatSessionTime` for display.
 */
export function getSessionStartAt(
  value: number | string | Date,
  sessionDate: Date | string
): Date {
  if (typeof value === "number" && isUnixSeconds(value)) {
    return new Date(value < 1e12 ? value * 1000 : value)
  }
  const d = typeof sessionDate === "string" ? new Date(sessionDate) : sessionDate
  const minutes = toMinutesFromMidnight(value, sessionDate)
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
}

// ==== SESSION DISPLAY NAME ==== //
export function getSessionDisplayName(session: Session): string {
  if (session.location?.name && session.room?.number) {
    return `${session.location.name} – ${session.room.number}`
  }
  return session.location?.name ?? "Session"
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Day abbreviation from session date (e.g. "Mon"). */
export function formatSessionDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return DAY_ABBR[d.getDay()] ?? ""
}

/** True if session date is Saturday (6) or Sunday (0). */
export function isSessionWeekend(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date
  const day = d.getDay()
  return day === 0 || day === 6
}

/** Date as Mon/Day/YY (e.g. "Mar/2/26"). */
export function formatSessionDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const mon = MONTH_ABBR[d.getMonth()] ?? ""
  const day = d.getDate()
  const yy = String(d.getFullYear()).slice(-2)
  return `${mon}/${day}/${yy}`
}

/** Session start time as "8:30 AM" / "12:00 PM". */
export function formatSessionStartTimeDisplay(
  startTime: number | string | Date,
  sessionDate?: Date | string
): string {
  const minutes = toMinutesFromMidnight(startTime, sessionDate)
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const ampm = h < 12 ? "AM" : "PM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

/** Local fee with thousands separator, no decimals (e.g. 6190 -> "6,190"). */
export function formatLocalFee(amount: number | null | undefined): string {
  const n = amount ?? 0
  return n.toLocaleString("en-US", { maximumFractionDigits: 0, minimumFractionDigits: 0 })
}

/** Pad number to at least 2 digits (e.g. 5 -> "05"). */
export function padTwo(n: number): string {
  return String(n).padStart(2, "0")
}