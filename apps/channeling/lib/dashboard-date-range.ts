import { SRI_LANKA_TZ } from '@/lib/utils'

const SRI_LANKA_UTC_OFFSET_MINUTES = 330

function colomboParts(ref: Date): {
  year: number
  month: number
  day: number
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ref)

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0)
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 0)
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 0)
  return { year, month, day }
}

function sriLankaDayBounds(
  year: number,
  month: number,
  day: number
): { start: Date; end: Date } {
  const offsetMs = SRI_LANKA_UTC_OFFSET_MINUTES * 60 * 1000
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs)
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs)
  return { start, end }
}

/** YYYY-MM-DD for the given instant in Asia/Colombo. */
export function getColomboYmd(ref: Date = new Date()): string {
  const { year, month, day } = colomboParts(ref)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Wall-clock today in Asia/Colombo as UTC instants.
 * Use for createdAt / timestamp filters.
 */
export function getColomboTodayRange(ref: Date = new Date()): {
  start: Date
  end: Date
} {
  const { year, month, day } = colomboParts(ref)
  return sriLankaDayBounds(year, month, day)
}

/**
 * Session.date is stored as UTC midnight of the calendar YYYY-MM-DD
 * (see create-doctor-session). Filter that calendar day for Colombo "today".
 */
export function getColomboSessionDateRange(ref: Date = new Date()): {
  start: Date
  end: Date
} {
  const ymd = getColomboYmd(ref)
  const [y, m, d] = ymd.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
  return { start, end }
}

/**
 * Current calendar month in Asia/Colombo as UTC instants.
 * Use for patient.createdAt "this month".
 */
export function getColomboMonthRange(ref: Date = new Date()): {
  start: Date
  end: Date
} {
  const { year, month } = colomboParts(ref)
  const offsetMs = SRI_LANKA_UTC_OFFSET_MINUTES * 60 * 1000
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - offsetMs)
  // Last day of month: day 0 of next month
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const end = new Date(
    Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999) - offsetMs
  )
  return { start, end }
}
