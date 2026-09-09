/** Local calendar midnight (strips time for inclusive day math). */
export function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Inclusive whole calendar days between from and to (ignores weekends/holidays). */
export function computeInclusiveCalendarDays(fromDate: Date, toDate: Date): number {
  const from = startOfLocalDay(fromDate).getTime();
  const to = startOfLocalDay(toDate).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

export const HALF_DAY_SESSIONS = ['AM', 'PM'] as const;
export type HalfDaySession = (typeof HALF_DAY_SESSIONS)[number];

export function isHalfDaySession(
  value: string | null | undefined
): value is HalfDaySession {
  return value === 'AM' || value === 'PM';
}

export function formatHalfDaySessionLabel(
  session: string | null | undefined
): string {
  if (session === 'AM') return 'Morning';
  if (session === 'PM') return 'Afternoon';
  return '';
}

/**
 * Application day count:
 * - Half-day mode: 0.5 when leave type allows it, same-day range, and session set
 * - Otherwise: inclusive calendar days (whole days only for v1)
 */
export function computeLeaveApplicationDays(options: {
  fromDate: Date;
  toDate: Date;
  isHalfDay?: boolean;
  allowHalfDay?: boolean;
  halfDaySession?: string | null;
}): number {
  if (
    options.isHalfDay &&
    options.allowHalfDay &&
    isHalfDaySession(options.halfDaySession) &&
    isSameLocalDay(options.fromDate, options.toDate)
  ) {
    return 0.5;
  }

  return computeInclusiveCalendarDays(options.fromDate, options.toDate);
}
