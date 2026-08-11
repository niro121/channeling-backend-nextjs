export type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

export type DateTimePartKey = keyof DateTimeParts;

export type DateTimePartsConfig = {
  yearFrom?: number;
  yearTo?: number;
};

export const emptyDateTimeParts: DateTimeParts = {
  year: '',
  month: '',
  day: '',
  hour: '',
  minute: '',
  second: ''
};

export const DATE_TIME_YEAR_FROM = 2000;

export function dateTimeYearTo(): number {
  return new Date().getFullYear() + 5;
}

export function padPart(value: string, size = 2): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return ''.padStart(size, '0');
  return digits.padStart(size, '0').slice(-size);
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function partRange(
  key: DateTimePartKey,
  parts: DateTimeParts,
  config?: DateTimePartsConfig
): { min: number; max: number; pad: number } {
  if (key === 'year') {
    return {
      min: config?.yearFrom ?? DATE_TIME_YEAR_FROM,
      max: config?.yearTo ?? dateTimeYearTo(),
      pad: 4
    };
  }
  if (key === 'month') return { min: 1, max: 12, pad: 2 };
  if (key === 'day') {
    const year = Number(parts.year) || new Date().getFullYear();
    const month = Number(parts.month) || 1;
    return { min: 1, max: daysInMonth(year, month), pad: 2 };
  }
  if (key === 'hour') return { min: 0, max: 23, pad: 2 };
  return { min: 0, max: 59, pad: 2 };
}

export function rangeOptions(
  min: number,
  max: number,
  pad: number
): Array<{ id: string; name: string }> {
  const options: Array<{ id: string; name: string }> = [];
  for (let value = min; value <= max; value += 1) {
    const label = String(value).padStart(pad, '0');
    options.push({ id: label, name: label });
  }
  return options;
}

/** Clamp a finished part. Empty stays empty. */
export function normalizePartValue(
  key: DateTimePartKey,
  raw: string,
  parts: DateTimeParts,
  config?: DateTimePartsConfig
): string {
  const digits = digitsOnly(raw);
  if (!digits) return '';

  const { min, max, pad } = partRange(key, parts, config);
  const next = clampNumber(Number(digits), min, max);
  if (Number.isNaN(next)) return '';
  return String(next).padStart(pad, '0');
}

/**
 * While typing: digits only; if the number already exceeds max, snap to max.
 * Incomplete values (e.g. "1" for month) stay unpadded so "12" can still be typed.
 */
export function constrainTypingValue(
  key: DateTimePartKey,
  raw: string,
  parts: DateTimeParts,
  config?: DateTimePartsConfig
): string {
  const digits = digitsOnly(raw);
  if (!digits) return '';

  const { min, max, pad } = partRange(key, parts, config);
  if (digits.length >= pad) {
    return String(clampNumber(Number(digits.slice(0, pad)), min, max)).padStart(
      pad,
      '0'
    );
  }

  const numeric = Number(digits);
  if (numeric > max) {
    return String(max).padStart(pad, '0');
  }

  return digits;
}

export function clampDateTimeParts(
  parts: DateTimeParts,
  config?: DateTimePartsConfig
): DateTimeParts {
  const next: DateTimeParts = {
    year: normalizePartValue('year', parts.year, parts, config),
    month: normalizePartValue('month', parts.month, parts, config),
    day: '',
    hour: normalizePartValue('hour', parts.hour, parts, config),
    minute: normalizePartValue('minute', parts.minute, parts, config),
    second: normalizePartValue('second', parts.second, parts, config)
  };
  next.day = normalizePartValue('day', parts.day, next, config);
  return next;
}

export function formatCombinedDateTime(
  parts: DateTimeParts,
  config?: DateTimePartsConfig
): string {
  const normalized = clampDateTimeParts(parts, config);
  if (!normalized.year && !normalized.month && !normalized.day) return '';
  return [
    normalized.year || '----',
    padPart(normalized.month || '0'),
    padPart(normalized.day || '0'),
    `${padPart(normalized.hour || '0')}:${padPart(normalized.minute || '0')}:${padPart(normalized.second || '0')}`
  ].join(' ');
}

/** Parses `2026-04-08 16:30` or `2026-04-08 16:30:00`. */
export function parseDateTimeParts(
  value?: string | null,
  config?: DateTimePartsConfig
): DateTimeParts {
  if (!value) return { ...emptyDateTimeParts };

  const match = value.match(
    /^(\d{4})[- ](\d{1,2})[- ](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/
  );
  if (!match) return { ...emptyDateTimeParts };

  return clampDateTimeParts(
    {
      year: match[1],
      month: match[2],
      day: match[3],
      hour: match[4],
      minute: match[5],
      second: match[6] ?? '00'
    },
    config
  );
}
