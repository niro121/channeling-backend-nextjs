const LKR_LOCALE = 'en-LK';

type FormatLkrOptions = {
  /** Include `LKR` prefix (default true). */
  currency?: boolean;
  /** Fraction digits when not using compact notation (default 0). */
  maximumFractionDigits?: number;
  /** Empty / invalid fallback (default `LKR 0` or `0`). */
  fallback?: string;
};

/**
 * Format an amount for table cells — grouped digits, no currency code.
 * Example: `225000` → `225,000`
 */
export function formatAmount(
  value: number | null | undefined,
  options?: { maximumFractionDigits?: number; fallback?: string }
): string {
  if (value == null || Number.isNaN(value)) {
    return options?.fallback ?? '0';
  }

  return value.toLocaleString(LKR_LOCALE, {
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    minimumFractionDigits: 0
  });
}

/**
 * Format LKR for display (cards, labels).
 * Example: `35700000` → `LKR 35,700,000`
 */
export function formatLkr(
  value: number | null | undefined,
  options?: FormatLkrOptions
): string {
  const withCurrency = options?.currency !== false;
  if (value == null || Number.isNaN(value)) {
    return (
      options?.fallback ?? (withCurrency ? 'LKR 0' : formatAmount(0, options))
    );
  }

  const formatted = formatAmount(value, {
    maximumFractionDigits: options?.maximumFractionDigits ?? 0
  });

  return withCurrency ? `LKR ${formatted}` : formatted;
}

/**
 * Compact LKR for KPI cards (thousands / millions).
 * Examples: `0` → `LKR 0`, `42800000` → `LKR 42.8M`, `7100` → `LKR 7.1K`
 */
export function formatLkrCompact(
  value: number | null | undefined,
  options?: { currency?: boolean; fallback?: string }
): string {
  const withCurrency = options?.currency !== false;
  if (value == null || Number.isNaN(value)) {
    return options?.fallback ?? (withCurrency ? 'LKR 0' : '0');
  }

  const abs = Math.abs(value);
  let formatted: string;

  if (abs >= 1_000_000) {
    formatted = `${trimTrailingZero((value / 1_000_000).toFixed(1))}M`;
  } else if (abs >= 1_000) {
    formatted = `${trimTrailingZero((value / 1_000).toFixed(1))}K`;
  } else {
    formatted = formatAmount(value);
  }

  return withCurrency ? `LKR ${formatted}` : formatted;
}

function trimTrailingZero(value: string): string {
  return value.replace(/\.0$/, '');
}
