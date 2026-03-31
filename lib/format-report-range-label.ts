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
