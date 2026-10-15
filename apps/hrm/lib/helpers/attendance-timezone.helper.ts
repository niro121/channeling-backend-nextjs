/**
 * Asia/Colombo helpers for Staff Attendance.
 *
 * Uses `@date-fns/tz` (`TZDate`) so wall-clock math is IANA-zone correct regardless
 * of the Node host timezone. Colombo has no DST, but we still use the zone name
 * so the code stays portable if the hospital timezone ever changes.
 *
 * RosterAllocation.date stores calendar days as UTC midnight for that civil date.
 * AttendanceDay.date uses the same convention so punches join planned shifts cleanly.
 */

import { TZDate } from '@date-fns/tz';
import { addDays, format } from 'date-fns';

export const ATTENDANCE_TIMEZONE = 'Asia/Colombo';

export type ColomboDateParts = {
  year: number;
  month: number; // 0-based
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Instant → TZDate whose getters return Asia/Colombo wall-clock. */
function toColombo(instant: Date | number | string): TZDate {
  const ms =
    instant instanceof Date
      ? instant.getTime()
      : typeof instant === 'number'
        ? instant
        : Date.parse(instant);

  if (Number.isNaN(ms)) {
    throw new RangeError('Invalid date for Asia/Colombo conversion');
  }

  return new TZDate(ms, ATTENDANCE_TIMEZONE);
}

/** Instant → wall-clock parts in Asia/Colombo. */
export function getColomboParts(instant: Date): ColomboDateParts {
  const zoned = toColombo(instant);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth(),
    day: zoned.getDate(),
    hours: zoned.getHours(),
    minutes: zoned.getMinutes(),
    seconds: zoned.getSeconds()
  };
}

/** `yyyy-MM-dd` for the Asia/Colombo civil day of an instant. */
export function toColomboDateIso(instant: Date): string {
  return format(toColombo(instant), 'yyyy-MM-dd');
}

/**
 * UTC midnight for the Colombo civil date (matches RosterAllocation.date storage).
 * Example: punch at 2025-08-15 08:12 +0530 → 2025-08-15T00:00:00.000Z
 */
export function colomboCivilDayUtc(instant: Date): Date {
  const zoned = toColombo(instant);
  return new Date(
    Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate())
  );
}

/** Parse `yyyy-MM-dd` (Colombo civil) → UTC midnight Date. */
export function colomboDateIsoToUtc(dateIso: string): Date {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Add whole civil days to a UTC-midnight Colombo civil date. */
export function addColomboCivilDays(civilDayUtc: Date, days: number): Date {
  return new Date(civilDayUtc.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Convert Colombo wall-clock on a civil day to a UTC instant.
 * `hours`/`minutes` are Colombo local (e.g. shift start 08:00).
 */
export function colomboWallTimeToUtc(
  civilDayUtc: Date,
  hours: number,
  minutes: number,
  seconds = 0
): Date {
  const year = civilDayUtc.getUTCFullYear();
  const month = civilDayUtc.getUTCMonth();
  const day = civilDayUtc.getUTCDate();
  const zoned = new TZDate(
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    ATTENDANCE_TIMEZONE
  );
  return new Date(zoned.getTime());
}

/** Inclusive start of Colombo day as real UTC instant (00:00 Asia/Colombo). */
export function colomboDayStartInstant(civilDayUtc: Date): Date {
  return colomboWallTimeToUtc(civilDayUtc, 0, 0, 0);
}

/** Exclusive end of Colombo day (next midnight Asia/Colombo). */
export function colomboDayEndInstant(civilDayUtc: Date): Date {
  const start = toColombo(colomboDayStartInstant(civilDayUtc));
  return new Date(addDays(start, 1).getTime());
}

/** Minutes from Colombo midnight for an instant. */
export function colomboMinutesFromMidnight(instant: Date): number {
  const zoned = toColombo(instant);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** Parse HH:mm → minutes from midnight; null if invalid. */
export function parseHhMmToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(mins) ||
    hours < 0 ||
    hours > 23 ||
    mins < 0 ||
    mins > 59
  ) {
    return null;
  }
  return hours * 60 + mins;
}

/** Normalize RFID / device user id for storage and lookup. */
export function normalizeFingerPrintRfid(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
