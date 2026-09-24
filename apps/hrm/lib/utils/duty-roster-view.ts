import { addDays, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import {
  DUTY_ROSTER_VIEW_MODES,
  type DutyRosterViewMode
} from '@/types/roster';

export function parseDutyView(value?: string | null): DutyRosterViewMode {
  if (value && DUTY_ROSTER_VIEW_MODES.includes(value as DutyRosterViewMode)) {
    return value as DutyRosterViewMode;
  }
  return 'daily';
}

export function dutyRangeLabel(
  dutyDate: Date,
  view: DutyRosterViewMode
): string {
  if (view === 'weekly') {
    const from = startOfWeek(dutyDate, { weekStartsOn: 0 });
    const to = addDays(from, 6);
    return `${format(from, 'dd MMM yyyy')} - ${format(to, 'dd MMM yyyy')}`;
  }
  if (view === 'monthly') {
    return format(dutyDate, 'MMMM yyyy');
  }
  return format(dutyDate, 'dd MMM yyyy');
}

export function dutyRangeBounds(
  dutyDate: Date,
  view: DutyRosterViewMode
): { from: Date; to: Date } {
  if (view === 'weekly') {
    const from = startOfWeek(dutyDate, { weekStartsOn: 0 });
    return { from, to: addDays(from, 6) };
  }
  if (view === 'monthly') {
    return { from: startOfMonth(dutyDate), to: endOfMonth(dutyDate) };
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
