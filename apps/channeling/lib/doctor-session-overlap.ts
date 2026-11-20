import { SRI_LANKA_TZ } from '@/lib/utils';

/** dayType 8 = Specific Date Only. 1 = Sunday … 7 = Saturday. */
export const SPECIFIC_DATE_DAY_TYPE = 8;

const DAY_TYPE_LABELS: Record<number, string> = {
  1: 'Sunday',
  2: 'Monday',
  3: 'Tuesday',
  4: 'Wednesday',
  5: 'Thursday',
  6: 'Friday',
  7: 'Saturday',
  8: 'Specific Date Only'
};

export type DoctorSessionTimeSlot = {
  id?: string;
  name?: string | null;
  dayType: number;
  applyTo?: Date | null;
  startTime: Date;
  endTime: Date;
};

/** Minutes from midnight in Sri Lanka. Touching endpoints (end === next start) do not overlap. */
export function sriLankaMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  let hour = 0;
  let minute = 0;
  for (const part of parts) {
    if (part.type === 'hour') hour = parseInt(part.value, 10);
    if (part.type === 'minute') minute = parseInt(part.value, 10);
  }
  if (hour === 24) hour = 0;
  return hour * 60 + minute;
}

export function sriLankaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/** 1 = Sunday … 7 = Saturday, in Sri Lanka. */
export function sriLankaDayType(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TZ,
    weekday: 'short'
  }).format(date);
  const map: Record<string, number> = {
    Sun: 1,
    Mon: 2,
    Tue: 3,
    Wed: 4,
    Thu: 5,
    Fri: 6,
    Sat: 7
  };
  return map[weekday] ?? 0;
}

export function formatSriLankaClock(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Half-open ranges: [start, end) overlaps [otherStart, otherEnd)
 * when each starts before the other ends. 5:00–6:00 and 6:00–7:00 do not overlap.
 */
export function timeRangesOverlap(
  start: number,
  end: number,
  otherStart: number,
  otherEnd: number
): boolean {
  return start < otherEnd && otherStart < end;
}

function isSpecificDate(slot: { dayType: number }): boolean {
  return slot.dayType === SPECIFIC_DATE_DAY_TYPE;
}

/** True when both schedules can land on the same calendar day. */
export function doctorSessionsShareADay(
  a: Pick<DoctorSessionTimeSlot, 'dayType' | 'applyTo'>,
  b: Pick<DoctorSessionTimeSlot, 'dayType' | 'applyTo'>
): boolean {
  const aSpecific = isSpecificDate(a);
  const bSpecific = isSpecificDate(b);

  if (aSpecific && bSpecific) {
    if (!a.applyTo || !b.applyTo) return false;
    return sriLankaDateKey(a.applyTo) === sriLankaDateKey(b.applyTo);
  }

  if (!aSpecific && !bSpecific) {
    return a.dayType === b.dayType;
  }

  const weekly = aSpecific ? b : a;
  const specific = aSpecific ? a : b;
  if (!specific.applyTo) return false;
  return sriLankaDayType(specific.applyTo) === weekly.dayType;
}

export function doctorSessionTimesOverlap(
  a: DoctorSessionTimeSlot,
  b: DoctorSessionTimeSlot
): boolean {
  if (a.id && b.id && a.id === b.id) return false;
  if (!doctorSessionsShareADay(a, b)) return false;
  return timeRangesOverlap(
    sriLankaMinutes(a.startTime),
    sriLankaMinutes(a.endTime),
    sriLankaMinutes(b.startTime),
    sriLankaMinutes(b.endTime)
  );
}

function formatSlDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/** Label for the day two doctor sessions can both occur on. */
export function sharedDayLabel(
  a: Pick<DoctorSessionTimeSlot, 'dayType' | 'applyTo'>,
  b: Pick<DoctorSessionTimeSlot, 'dayType' | 'applyTo'>
): string {
  const aSpecific = isSpecificDate(a) && a.applyTo;
  const bSpecific = isSpecificDate(b) && b.applyTo;
  if (aSpecific && bSpecific && a.applyTo) return formatSlDate(a.applyTo);
  const specific = aSpecific ? a : bSpecific ? b : null;
  if (specific?.applyTo) {
    const weekday = DAY_TYPE_LABELS[sriLankaDayType(specific.applyTo)] ?? 'that day';
    return `${weekday} · ${formatSlDate(specific.applyTo)}`;
  }
  return DAY_TYPE_LABELS[a.dayType] ?? 'that day';
}

export function findOverlappingDoctorSession<T extends DoctorSessionTimeSlot>(
  candidate: DoctorSessionTimeSlot,
  existing: T[]
): T | null {
  const start = sriLankaMinutes(candidate.startTime);
  const end = sriLankaMinutes(candidate.endTime);

  for (const other of existing) {
    if (candidate.id && other.id && candidate.id === other.id) continue;
    if (!doctorSessionsShareADay(candidate, other)) continue;
    if (
      timeRangesOverlap(
        start,
        end,
        sriLankaMinutes(other.startTime),
        sriLankaMinutes(other.endTime)
      )
    ) {
      return other;
    }
  }

  return null;
}

export function formatDoctorSessionOverlapMessage(other: DoctorSessionTimeSlot): string {
  const start = formatSriLankaClock(other.startTime);
  const end = formatSriLankaClock(other.endTime);
  const when =
    isSpecificDate(other) && other.applyTo
      ? new Intl.DateTimeFormat('en-GB', {
          timeZone: SRI_LANKA_TZ,
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }).format(other.applyTo)
      : (DAY_TYPE_LABELS[other.dayType] ?? 'that day');
  const name = other.name?.trim() ? `"${other.name.trim()}"` : 'a session';
  return `This doctor already has ${name} on ${when} from ${start} to ${end}. Those times overlap.`;
}

export function formatSessionTimeOverlapMessage(startTime: Date, endTime: Date): string {
  const start = formatSriLankaClock(startTime);
  const end = formatSriLankaClock(endTime);
  return `This doctor already has a session on this date from ${start} to ${end}. Those times overlap.`;
}
