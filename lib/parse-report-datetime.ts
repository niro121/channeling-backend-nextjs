/**
 * Parse report filter values from DateTimeRangePicker (`YYYY-MM-DDTHH:mm`) or date-only (`YYYY-MM-DD`).
 * - Start (asEnd=false): start of minute or start of day.
 * - End (asEnd=true): inclusive through selected minute (`:59.999`) or end of day (`23:59:59.999`).
 */

const REPORT_DT_MINUTE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const REPORT_DT_SECOND = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;
const REPORT_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const REPORT_DT_MINUTE_SL = /^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})$/;

/** Local calendar semantics (matches `datetime-local` in the browser). */
export function parseReportDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;

  if (REPORT_DATE_ONLY.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (asEnd) return new Date(y, m - 1, d, 23, 59, 59, 999);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  if (!trimmed.includes('T')) return null;

  const minuteMatch = REPORT_DT_MINUTE.exec(trimmed);
  if (minuteMatch) {
    const year = Number(minuteMatch[1]);
    const month = Number(minuteMatch[2]) - 1;
    const day = Number(minuteMatch[3]);
    const hour = Number(minuteMatch[4]);
    const minute = Number(minuteMatch[5]);
    if (asEnd) return new Date(year, month, day, hour, minute, 59, 999);
    return new Date(year, month, day, hour, minute, 0, 0);
  }

  const secondMatch = REPORT_DT_SECOND.exec(trimmed);
  if (secondMatch) {
    const year = Number(secondMatch[1]);
    const month = Number(secondMatch[2]) - 1;
    const day = Number(secondMatch[3]);
    const hour = Number(secondMatch[4]);
    const minute = Number(secondMatch[5]);
    const second = Number(secondMatch[6]);
    if (asEnd) return new Date(year, month, day, hour, minute, second, 999);
    return new Date(year, month, day, hour, minute, second, 0);
  }

  const d = new Date(trimmed);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Sri Lanka wall-clock strings for UTC-stored timestamps (default offset +05:30). */
export function parseReportDateTimeSl(
  value: string,
  asEnd: boolean,
  slOffset = '+05:30'
): Date | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;

  if (REPORT_DATE_ONLY.test(trimmed)) {
    return asEnd
      ? new Date(`${trimmed}T23:59:59.999${slOffset}`)
      : new Date(`${trimmed}T00:00:00${slOffset}`);
  }

  const withoutZ = trimmed.replace(/Z$/i, '');
  const minuteMatch = REPORT_DT_MINUTE_SL.exec(withoutZ);
  if (minuteMatch) {
    const datePart = minuteMatch[1];
    const hour = String(parseInt(minuteMatch[2], 10)).padStart(2, '0');
    const minute = String(parseInt(minuteMatch[3], 10)).padStart(2, '0');
    if (asEnd) return new Date(`${datePart}T${hour}:${minute}:59.999${slOffset}`);
    return new Date(`${datePart}T${hour}:${minute}:00${slOffset}`);
  }

  const d = new Date(trimmed);
  return Number.isFinite(d.getTime()) ? d : null;
}
