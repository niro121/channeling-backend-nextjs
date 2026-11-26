/** Parse HH:mm → minutes from midnight. */
function timeToMinutesOfDay(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Normalize `7:00` / `07:00:00` → `07:00`. */
export function normalizeShiftTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/** Auto total working hours from start/end/break (overnight when flagged or end ≤ start). */
export function calcTotalWorkingHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  isOvernight: boolean
): number {
  const start = timeToMinutesOfDay(startTime);
  const end = timeToMinutesOfDay(endTime);
  if (start === null || end === null) return 0;

  let span = end - start;
  if (isOvernight || span <= 0) {
    span += 24 * 60;
  }

  const worked = Math.max(0, span - Math.max(0, breakMinutes || 0));
  return Math.round((worked / 60) * 10) / 10;
}
