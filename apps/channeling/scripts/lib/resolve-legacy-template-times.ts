/**
 * Resolve DoctorSession start/end from legacy migrate API rows.
 * Many legacy rows store start_time=0 and only encode clock in apply_to + display strings or name.
 */

import moment from 'moment';

export type LegacyTemplateTimeFields = {
  start_time_unix?: number | null;
  end_time_unix?: number | null;
  start_time?: number | string;
  end_time?: number | string;
  apply_to?: number | string | null;
  apply_to_date?: string | null;
  duration_minutes?: number;
  name?: string;
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function legacyUnixToDate(value: unknown): Date | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n >= 1e12 ? n : n * 1000);
}

const TIME_FORMATS = [
  'hh:mm A',
  'h:mm A',
  'hh:mmA',
  'h:mmA',
  'hh.mm A',
  'h.mm A',
  'HH:mm',
  'H:mm',
];

function normalizeClockDisplay(display: string): string {
  return display
    .replace(/(\d)\.(\d{2})\s*(am|pm)\b/gi, '$1:$2 $3')
    .replace(/(\d)(am|pm)\b/gi, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTimeOnDate(ymd: string, display: string): Date | null {
  const base = moment.utc(ymd, 'YYYY-MM-DD', true);
  if (!base.isValid()) return null;
  const normalized = normalizeClockDisplay(display);
  const t = moment(normalized, TIME_FORMATS, true);
  if (!t.isValid()) return null;
  return base.clone().hour(t.hour()).minute(t.minute()).second(0).millisecond(0).toDate();
}

/** e.g. "29 05 2026 11.30 am", "2026/06/21 7.30am", "12 pm" */
function parseTimeFromTemplateName(name: string, applyYmd: string): Date | null {
  const m = name.match(/(\d{1,2}(?:[.:]\d{2})?\s*(?:am|pm))/i);
  if (m) return parseTimeOnDate(applyYmd, m[1]);
  const loose = name.match(/(\d{1,2})\s*(am|pm)\b/i);
  if (loose) return parseTimeOnDate(applyYmd, `${loose[1]} ${loose[2]}`);
  return null;
}

function applyToYmd(fields: LegacyTemplateTimeFields): string {
  const fromDate = (fields.apply_to_date ?? '').trim();
  if (fromDate) return fromDate.slice(0, 10);
  const apply = legacyUnixToDate(fields.apply_to);
  if (apply) return apply.toISOString().slice(0, 10);
  const fromName = (fields.name ?? '').match(/(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (fromName) return `${fromName[1]}-${fromName[2]}-${fromName[3]}`;
  const dmy = (fields.name ?? '').match(/(\d{2})\s+(\d{2})\s+(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return '';
}

export function resolveLegacyTemplateTimes(
  fields: LegacyTemplateTimeFields
): { startTime: Date; endTime: Date; source: string } | null {
  let start = legacyUnixToDate(
    fields.start_time_unix ??
      (typeof fields.start_time === 'number' ? fields.start_time : undefined)
  );
  let end = legacyUnixToDate(
    fields.end_time_unix ?? (typeof fields.end_time === 'number' ? fields.end_time : undefined)
  );
  let source = 'unix';

  const applyYmd = applyToYmd(fields);
  const startStr =
    typeof fields.start_time === 'string' ? normalizeClockDisplay(fields.start_time) : '';
  const endStr = typeof fields.end_time === 'string' ? normalizeClockDisplay(fields.end_time) : '';

  if ((!start || !end) && applyYmd) {
    if (!start && startStr) {
      start = parseTimeOnDate(applyYmd, startStr);
      source = 'apply_to_date+start_display';
    }
    if (!start && fields.name) {
      start = parseTimeFromTemplateName(fields.name, applyYmd);
      source = 'apply_to_date+name';
    }
    if (!end && endStr) {
      end = parseTimeOnDate(applyYmd, endStr);
    }
    if (!end && start && safeNumber(fields.duration_minutes) > 0) {
      end = new Date(start.getTime() + safeNumber(fields.duration_minutes) * 60_000);
    }
    if (!end && start) {
      end = new Date(start.getTime() + 60 * 60_000);
    }
  }

  if ((!start || !end) && startStr && endStr) {
    const ref = '2000-01-01';
    if (!start) start = parseTimeOnDate(ref, startStr);
    if (!end) end = parseTimeOnDate(ref, endStr);
    source = 'clock-only-ref-date';
  }

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { startTime: start, endTime: end, source };
}
