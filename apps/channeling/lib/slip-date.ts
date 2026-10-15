/**
 * Parse a UI slip date string (YYYY-MM-DD) into a Date at UTC midnight.
 * Returns null when empty or invalid.
 */
export function parseSlipDateInput(value: string | null | undefined): Date | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

/** Format a stored slip date for UI/display as YYYY-MM-DD. */
export function formatSlipDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Legacy ledger remarks pattern: `| Slip Date: YYYY-MM-DD` */
export function extractSlipDateFromRemarks(remarks: string | null | undefined): string | null {
  const text = (remarks ?? "").trim()
  if (!text) return null
  const match = text.match(/(?:^|\|)\s*Slip Date:\s*(\d{4}-\d{2}-\d{2})\s*(?:\||$)/i)
  return match?.[1] ?? null
}

/** Prefer stored slipDate; fall back to remarks parser for legacy ledger rows. */
export function resolveSlipDateDisplay(
  slipDate: Date | string | null | undefined,
  remarks?: string | null
): string | null {
  return formatSlipDate(slipDate) ?? extractSlipDateFromRemarks(remarks)
}
