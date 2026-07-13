/** Normalize JSON field to string[] (MongoDB/Prisma sometimes returns array as object { "0": "id1", "1": "id2" }). */
export function normalizedIncludedIds(includedHandoverIds: string[] | null | unknown): string[] {
  if (Array.isArray(includedHandoverIds)) {
    return (includedHandoverIds as string[]).filter((id) => typeof id === "string" && id.trim() !== "")
  }
  if (includedHandoverIds != null && typeof includedHandoverIds === "object" && !Array.isArray(includedHandoverIds)) {
    const obj = includedHandoverIds as Record<string, unknown>
    const ids = Object.keys(obj)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => obj[k])
      .filter((id): id is string => typeof id === "string" && id.trim() !== "")
    if (ids.length > 0) return ids
  }
  return []
}

/** Local wall-clock `YYYY-MM-DDTHH:mm` for datetime-local / report filters (not UTC). */
export function formatLocalDateTimeMinute(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export type HandoverCashierSummarySource = {
  fromUserId: string
  createdAt: Date | string
  shift?: { startedAt?: Date | string | null } | null
}

export type HandoverCashierSummaryFilters = {
  dateFrom: string
  dateTo: string
  userIds: string[]
}

/**
 * Cashier summary window for a handover receive:
 * - dateFrom = earliest shift.startedAt across this handover + included chain
 * - dateTo = this handover's createdAt (till handed over)
 * - userIds = unique fromUserId across the chain
 */
export function deriveHandoverCashierSummaryFilters(
  handover: HandoverCashierSummarySource,
  includedHandovers: HandoverCashierSummarySource[] = []
): HandoverCashierSummaryFilters | null {
  const chain = [handover, ...includedHandovers]
  const startTimes = chain
    .map((h) => h.shift?.startedAt)
    .filter((v): v is Date | string => v != null && v !== "")
    .map((v) => new Date(v))
    .filter((d) => Number.isFinite(d.getTime()))

  if (startTimes.length === 0 || !handover.createdAt) return null

  const earliest = startTimes.reduce((min, d) => (d.getTime() < min.getTime() ? d : min))
  const dateFrom = formatLocalDateTimeMinute(earliest)
  const dateTo = formatLocalDateTimeMinute(handover.createdAt)
  if (!dateFrom || !dateTo) return null

  const userIds = [
    ...new Set(
      chain
        .map((h) => (typeof h.fromUserId === "string" ? h.fromUserId.trim() : ""))
        .filter((id) => id !== "")
    ),
  ]

  if (userIds.length === 0) return null

  return { dateFrom, dateTo, userIds }
}

/** Build `/reports/cashier-summary?...` deep-link from derived filters. */
export function buildCashierSummaryReportUrl(
  filters: HandoverCashierSummaryFilters,
  format: "summary" | "detail" = "detail"
): string {
  const params = new URLSearchParams()
  params.set("dateFrom", filters.dateFrom)
  params.set("dateTo", filters.dateTo)
  params.set("format", format)
  if (filters.userIds.length === 1) {
    params.set("userId", filters.userIds[0])
  } else {
    params.set("userIds", filters.userIds.join(","))
  }
  return `/reports/cashier-summary?${params.toString()}`
}
