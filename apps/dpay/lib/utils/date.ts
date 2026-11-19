import { format, isValid, parseISO } from 'date-fns';

/** Table / list audit timestamps — e.g. `04/08/2026 01:30 PM` */
export const DATE_TIME_DISPLAY_FORMAT = 'dd/MM/yyyy hh:mm a';

/** Longer audit display — e.g. `August 4th 2026, 1.30 PM` */
export const DATE_TIME_AUDIT_FORMAT = "MMMM do yyyy, h.mm a";

/** Date-only display — e.g. `04/08/2026` */
export const DATE_DISPLAY_FORMAT = 'dd/MM/yyyy';

function toValidDate(date?: Date | string | null): Date | null {
  if (!date) return null;

  const parsed =
    date instanceof Date
      ? date
      : /^\d{4}-\d{2}-\d{2}/.test(date)
        ? parseISO(date)
        : new Date(date);

  return isValid(parsed) ? parsed : null;
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
