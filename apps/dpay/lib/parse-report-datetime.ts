/**
 * Parse report filter values from DateTimeRangePicker (`YYYY-MM-DDTHH:mm`) or date-only (`YYYY-MM-DD`).
 * - Start (asEnd=false): start of minute or start of day.
 * - End (asEnd=true): inclusive through selected minute (`:59.999`) or end of day (`23:59:59.999`).
 */

const REPORT_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const REPORT_DT_MINUTE_SL = /^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})$/;

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
