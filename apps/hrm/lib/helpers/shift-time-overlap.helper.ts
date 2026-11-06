/**
 * HH:mm helpers for duty / roster allocation overlap checks.
 * Overnight shifts (end <= start) are treated as ending the next calendar day.
 */

export function parseHhMmToMinutes(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

export type MinuteInterval = { start: number; end: number };

/** Normalize a shift window to [start, end) minutes from day start (end may be > 1440). */
export function shiftToInterval(
  startTime: string,
  endTime: string
): MinuteInterval | null {
  const start = parseHhMmToMinutes(startTime);
  const end = parseHhMmToMinutes(endTime);
  if (start === null || end === null) return null;
  if (end <= start) {
    return { start, end: end + 24 * 60 };
  }
  return { start, end };
}

export function intervalsOverlap(a: MinuteInterval, b: MinuteInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function shiftsOverlap(input: {
  startTime: string;
  endTime: string;
  otherStartTime: string;
  otherEndTime: string;
}): boolean {
  const a = shiftToInterval(input.startTime, input.endTime);
  const b = shiftToInterval(input.otherStartTime, input.otherEndTime);
  if (!a || !b) return false;
  return intervalsOverlap(a, b);
}

/** Half-day leave windows on the civil day (hospital convention). */
export const HALF_DAY_LEAVE_WINDOWS = {
  AM: { start: 0, end: 12 * 60 },
  PM: { start: 12 * 60, end: 24 * 60 }
} as const;

export type HalfDaySession = keyof typeof HALF_DAY_LEAVE_WINDOWS;

export function isHalfDaySession(
  value: string | null | undefined
): value is HalfDaySession {
  return value === 'AM' || value === 'PM';
}

/**
 * True when the duty shift overlaps leave covering that calendar day.
 * Full-day leave (no half session / days !== 0.5) overlaps any shift.
 * Half-day AM/PM only overlaps when the shift window intersects that session.
 */
export function dutyOverlapsLeaveWindow(input: {
  startTime: string;
  endTime: string;
  halfDaySession?: string | null;
  /** When days is known; 0.5 with session = half day. */
  days?: number | null;
}): boolean {
  const shift = shiftToInterval(input.startTime, input.endTime);
  if (!shift) return true; // fail-safe: warn if times unknown

  const isHalf =
    isHalfDaySession(input.halfDaySession) &&
    (input.days == null || input.days === 0.5);

  if (!isHalf) {
    return true;
  }

  const leave = HALF_DAY_LEAVE_WINDOWS[input.halfDaySession!];
  // Compare only the portion of the shift that falls on the duty calendar day [0, 1440).
  const onDutyDay: MinuteInterval = {
    start: shift.start,
    end: Math.min(shift.end, 24 * 60)
  };
  if (onDutyDay.end <= onDutyDay.start) {
    // Pure overnight after midnight segment — treat as early AM.
    return intervalsOverlap({ start: 0, end: shift.end % (24 * 60) || 0 }, leave);
  }
  return intervalsOverlap(onDutyDay, leave);
}
