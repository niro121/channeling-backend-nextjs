import { format, isValid, parse, parseISO } from 'date-fns';

/** Table / list audit timestamps — e.g. `04/08/2026 01:30 PM` */
export const DATE_TIME_DISPLAY_FORMAT = 'dd/MM/yyyy hh:mm a';

/** Longer audit display — e.g. `August 4th 2026, 1.30 PM` */
export const DATE_TIME_AUDIT_FORMAT = "MMMM do yyyy, h.mm a";

/** Date-only display — e.g. `04/08/2026` */
export const DATE_DISPLAY_FORMAT = 'dd/MM/yyyy';

const DISPLAY_DATE_PATTERNS = [
  DATE_DISPLAY_FORMAT,
  DATE_TIME_DISPLAY_FORMAT,
  DATE_TIME_AUDIT_FORMAT
] as const;

/**
 * Coerce a Date / ISO / app display-format string into a valid Date.
 * Returns `null` for empty or unparseable values (including `—`).
 */
export function toValidDate(date?: Date | string | null): Date | null {
  if (!date || date === '—') return null;

  if (date instanceof Date) {
    return isValid(date) ? date : null;
  }

  const trimmed = date.trim();
  if (!trimmed || trimmed === '—') return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const iso = parseISO(trimmed);
    if (isValid(iso)) return iso;
  }

  for (const pattern of DISPLAY_DATE_PATTERNS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) return parsed;
  }

  const fallback = new Date(trimmed);
  return isValid(fallback) ? fallback : null;
}

/**
 * Formats a date/datetime for display with date-fns.
 * Returns `—` for empty or invalid values.
 */
export function formatDateTime(
  date?: Date | string | null,
  pattern: string = DATE_TIME_DISPLAY_FORMAT
): string {
  const parsed = toValidDate(date);
  if (!parsed) return '—';
  return format(parsed, pattern);
}

/** Convenience wrapper for the longer audit-style datetime. */
export function formatAuditDateTime(date?: Date | string | null): string {
  return formatDateTime(date, DATE_TIME_AUDIT_FORMAT);
}

/** Convenience wrapper for date-only display. */
export function formatDate(date?: Date | string | null): string {
  return formatDateTime(date, DATE_DISPLAY_FORMAT);
}

const DEFAULT_CALENDAR_PAST_YEARS = 10;
const DEFAULT_CALENDAR_FUTURE_YEARS = 15;

/**
 * Sliding year window for calendar dropdowns (`fromYear`/`toYear` or `startMonth`/`endMonth`).
 * Anchored on the current year, expanded to include any extra years provided.
 */
export function getCalendarYearRange(
  extraYears: number[] = [],
  pastYears: number = DEFAULT_CALENDAR_PAST_YEARS,
  futureYears: number = DEFAULT_CALENDAR_FUTURE_YEARS
) {
  const currentYear = new Date().getFullYear();
  const fromYear = Math.min(currentYear - pastYears, ...extraYears, currentYear);
  const toYear = Math.max(currentYear + futureYears, ...extraYears, currentYear);

  return {
    fromYear,
    toYear,
    startMonth: new Date(fromYear, 0),
    endMonth: new Date(toYear, 11)
  };
}
