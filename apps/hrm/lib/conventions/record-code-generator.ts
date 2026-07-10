import { getNextSequenceNumber } from '../sequence';

export type GenerateRecordCodeOptions = {
  /** First sequence number to emit for a new scope (default: 1). */
  startFrom?: number;
  /** Optional upper bound for the sequence counter. */
  max?: number;
  /** Zero-pad the numeric suffix to this width (e.g. 4 → ST-RA-0026). */
  padLength?: number;
};

export type GenerateRecordCodeResult =
  | { success: true; code: string; sequence: number; scopeKey: string }
  | { success: false; errorCode: 'INVALID_PREFIX' | 'LIMIT_EXCEEDED' };

const PREFIX_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

/** Build the Sequence.scopeKey used for a record-code prefix (e.g. `record:ST-RA`). */
export function recordCodeScopeKey(prefix: string): string {
  return `record:${prefix}`;
}

function normalizePrefix(prefix: string): string | null {
  const trimmed = prefix.trim();
  if (!trimmed || !PREFIX_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed.toUpperCase();
}

function formatSequenceNumber(value: number, padLength?: number): string {
  if (padLength === undefined) {
    return String(value);
  }

  return String(value).padStart(padLength, '0');
}

/**
 * Reserve the next sequence value for `prefix` and return a unique code.
 * Example: prefix `ST-RA` → `ST-RA-26`, `ST-RA-27`, …
 */
export async function generateRecordCode(
  prefix: string,
  options?: GenerateRecordCodeOptions
): Promise<GenerateRecordCodeResult> {
  const normalizedPrefix = normalizePrefix(prefix);
  if (!normalizedPrefix) {
    return { success: false, errorCode: 'INVALID_PREFIX' };
  }

  const scopeKey = recordCodeScopeKey(normalizedPrefix);
  const result = await getNextSequenceNumber(scopeKey, {
    startFrom: options?.startFrom ?? 1,
    max: options?.max,
  });

  if (!result.success) {
    return { success: false, errorCode: 'LIMIT_EXCEEDED' };
  }

  const suffix = formatSequenceNumber(result.value, options?.padLength);

  return {
    success: true,
    code: `${normalizedPrefix}-${suffix}`,
    sequence: result.value,
    scopeKey,
  };
}
