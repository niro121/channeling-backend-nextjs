import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns';
import {
  DUTY_ROSTER_VIEW_ALIASES,
  DUTY_ROSTER_VIEW_MODES,
  type DutyRosterRow,
  type DutyRosterViewMode
} from '@/types/roster';

export function parseDutyView(value?: string | null): DutyRosterViewMode {
  if (!value) return 'list';
  if (DUTY_ROSTER_VIEW_MODES.includes(value as DutyRosterViewMode)) {
    return value as DutyRosterViewMode;
  }
  const aliased = DUTY_ROSTER_VIEW_ALIASES[value];
  if (aliased) return aliased;
  return 'list';
}

export function dutyRangeLabel(
  dutyDate: Date,
  view: DutyRosterViewMode
): string {
  if (view === 'days' || view === 'weeks') {
    return format(dutyDate, 'MMMM yyyy');
  }
  if (view === 'months') {
    return format(dutyDate, 'yyyy');
  }
  return format(dutyDate, 'dd MMM yyyy');
}

export function dutyRangeBounds(
  dutyDate: Date,
  view: DutyRosterViewMode
): { from: Date; to: Date } {
  if (view === 'days' || view === 'weeks') {
    return { from: startOfMonth(dutyDate), to: endOfMonth(dutyDate) };
  }
  if (view === 'months') {
    return { from: startOfYear(dutyDate), to: endOfYear(dutyDate) };
  }
  return { from: dutyDate, to: dutyDate };
}

export function formatDutyDateLabel(value?: string | null): string {
  if (!value) return '—';
  try {
    return format(parseISO(String(value).slice(0, 10)), 'EEE dd MMM yyyy');
  } catch {
    return value;
  }
}

export type DutyBucketCard = {
  id: string;
  label: string;
  subLabel: string;
  fromIso: string;
  toIso: string;
  dutyCount: number;
  staffCount: number;
  rows: DutyRosterRow[];
};

function rowDateKey(row: DutyRosterRow): string {
  return String(row.date ?? '').slice(0, 10);
}

function filterRowsInRange(
  rows: DutyRosterRow[],
  fromIso: string,
  toIso: string
): DutyRosterRow[] {
  return rows.filter((row) => {
    const key = rowDateKey(row);
    return key >= fromIso && key <= toIso;
  });
}

function staffCountFor(rows: DutyRosterRow[]): number {
  return new Set(rows.map((row) => row.staffId)).size;
}

/** One card per calendar day in the month of `dutyDate`. */
export function buildDutyDayCards(
  dutyDate: Date,
  rows: DutyRosterRow[]
): DutyBucketCard[] {
  const from = startOfMonth(dutyDate);
  const to = endOfMonth(dutyDate);
  return eachDayOfInterval({ start: from, end: to }).map((day) => {
    const iso = format(day, 'yyyy-MM-dd');
    const dayRows = filterRowsInRange(rows, iso, iso);
    return {
      id: iso,
      label: format(day, 'dd'),
      subLabel: format(day, 'EEE'),
      fromIso: iso,
      toIso: iso,
      dutyCount: dayRows.length,
      staffCount: staffCountFor(dayRows),
      rows: dayRows
    };
  });
}

/**
 * Week cards (Sun–Sat) that intersect the month of `dutyDate`.
 * Weeks are unique by start ISO.
 */
export function buildDutyWeekCards(
  dutyDate: Date,
  rows: DutyRosterRow[]
): DutyBucketCard[] {
  const monthStart = startOfMonth(dutyDate);
  const monthEnd = endOfMonth(dutyDate);
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const cards: DutyBucketCard[] = [];
  let cursor = firstWeekStart;
  let weekIndex = 1;

  while (cursor <= monthEnd) {
    const weekEnd = addDays(cursor, 6);
    const fromIso = format(cursor, 'yyyy-MM-dd');
    const toIso = format(weekEnd, 'yyyy-MM-dd');
    const weekRows = filterRowsInRange(rows, fromIso, toIso);
    cards.push({
      id: fromIso,
      label: `Week ${weekIndex}`,
      subLabel: `${format(cursor, 'dd MMM')} – ${format(weekEnd, 'dd MMM')}`,
      fromIso,
      toIso,
      dutyCount: weekRows.length,
      staffCount: staffCountFor(weekRows),
      rows: weekRows
    });
    cursor = addDays(cursor, 7);
    weekIndex += 1;
  }

  return cards;
}

/** Twelve month cards for the year of `dutyDate`. */
export function buildDutyMonthCards(
  dutyDate: Date,
  rows: DutyRosterRow[]
): DutyBucketCard[] {
  const year = dutyDate.getFullYear();
  return Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(year, index, 1);
    const from = startOfMonth(monthDate);
    const to = endOfMonth(monthDate);
    const fromIso = format(from, 'yyyy-MM-dd');
    const toIso = format(to, 'yyyy-MM-dd');
    const monthRows = filterRowsInRange(rows, fromIso, toIso);
    return {
      id: fromIso,
      label: format(monthDate, 'MMMM'),
      subLabel: format(monthDate, 'yyyy'),
      fromIso,
      toIso,
      dutyCount: monthRows.length,
      staffCount: staffCountFor(monthRows),
      rows: monthRows
    };
  });
}
