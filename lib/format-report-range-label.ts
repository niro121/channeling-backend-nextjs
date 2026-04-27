/**
 * Formats a report filter range for display, e.g.
 * "30/03/2026, 00:00 - 30/03/2026, 23:59"
 *
 * Supports:
 * - datetime-local style: `YYYY-MM-DDTHH:mm` / `YYYY-MM-DDTHH:mm:ss`
 * - date-only: `YYYY-MM-DD` → from uses 00:00, to uses 23:59 (local calendar day)
 */
function parseDateTimePart(s: string, kind: 'start' | 'end'): Date | null {
  const trimmed = s.trim();
  if (!trimmed) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const y = Number(dateOnly[1]);
    const m = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);
    if (kind === 'start') return new Date(y, m, day, 0, 0, 0, 0);
    return new Date(y, m, day, 23, 59, 0, 0);
  }

  const d = new Date(trimmed);
  return Number.isFinite(d.getTime()) ? d : null;
}

function formatDateTimePart(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}

export function formatReportRangeLabel(fromStr: string, toStr: string): string {
  const from = parseDateTimePart(fromStr, 'start');
  const to = parseDateTimePart(toStr, 'end');
  if (!from || !to) {
    return `${fromStr} - ${toStr}`;
  }
  return `${formatDateTimePart(from)} - ${formatDateTimePart(to)}`;
}

const COLOMBO_TZ = 'Asia/Colombo';

function ordinalSuffix(day: number): string {
  if (day % 10 === 1 && day !== 11) return 'st';
  if (day % 10 === 2 && day !== 12) return 'nd';
  if (day % 10 === 3 && day !== 13) return 'rd';
  return 'th';
}

function colomboDayMonthYear(d: Date): {
  day: number;
  monthLong: string;
  year: number;
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: COLOMBO_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).formatToParts(d);
  return {
    day: Number(parts.find((p) => p.type === 'day')?.value ?? 0),
    monthLong: parts.find((p) => p.type === 'month')?.value ?? '',
    year: Number(parts.find((p) => p.type === 'year')?.value ?? 0)
  };
}

function formatOrdinalRangeSameCalendarYear(
  a: { day: number; monthLong: string; year: number },
  b: { day: number; monthLong: string; year: number }
): string {
  if (
    a.day === b.day &&
    a.monthLong === b.monthLong &&
    a.year === b.year
  ) {
    return `${a.day}${ordinalSuffix(a.day)} ${a.monthLong}`;
  }
  if (a.year === b.year && a.monthLong === b.monthLong) {
    return `${a.day}${ordinalSuffix(a.day)} to ${b.day}${ordinalSuffix(b.day)} ${a.monthLong}`;
  }
  return `${a.day}${ordinalSuffix(a.day)} ${a.monthLong} to ${b.day}${ordinalSuffix(b.day)} ${b.monthLong}`;
}

/**
 * Selected filter range intersected with a calendar year (Colombo), for table subheaders.
 * e.g. "24th April to 21st June" under year 2026.
 */
export function formatReportRangeOrdinalClipToYear(
  calendarYear: string,
  fromStr: string,
  toStr: string
): string {
  const from = parseDateTimePart(fromStr, 'start');
  const to = parseDateTimePart(toStr, 'end');
  if (!from || !to) return '';

  const y = Number(calendarYear);
  if (!Number.isFinite(y)) return '';

  const yStart = new Date(`${y}-01-01T00:00:00+05:30`);
  const yEnd = new Date(`${y}-12-31T23:59:59.999+05:30`);
  const clipStartMs = Math.max(from.getTime(), yStart.getTime());
  const clipEndMs = Math.min(to.getTime(), yEnd.getTime());
  if (clipStartMs > clipEndMs) return '—';

  const a = colomboDayMonthYear(new Date(clipStartMs));
  const b = colomboDayMonthYear(new Date(clipEndMs));
  return formatOrdinalRangeSameCalendarYear(a, b);
}
