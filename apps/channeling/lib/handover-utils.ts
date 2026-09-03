import { formatCents } from "@/lib/format-money"

export const HANDOVER_AMOUNT_METHOD_KEYS = [
  "cashCents",
  "cardCents",
  "slipCents",
  "checkCents",
  "creditCents",
  "eWalletCents",
] as const

export type HandoverMethodAmountKey = (typeof HANDOVER_AMOUNT_METHOD_KEYS)[number]

export type HandoverMethodAmounts = Record<HandoverMethodAmountKey, number>

export const HANDOVER_AMOUNT_METHOD_LABELS: Record<HandoverMethodAmountKey, string> = {
  cashCents: "Cash",
  cardCents: "Card",
  slipCents: "Slips",
  checkCents: "Cheques",
  creditCents: "Credit",
  eWalletCents: "E-Wallet",
}

export type HandoverAmountOver = {
  key: HandoverMethodAmountKey
  label: string
  enteredCents: number
  availableCents: number
}

/** Available to hand over: full till minus non-cash already held in open reconciliation. */
export function expectedHandoverAvailableFromTill(
  till: HandoverMethodAmounts,
  held?: { cardCents?: number; slipCents?: number; checkCents?: number; eWalletCents?: number } | null
): HandoverMethodAmounts {
  return {
    cashCents: till.cashCents,
    cardCents: Math.max(0, till.cardCents - (held?.cardCents ?? 0)),
    slipCents: Math.max(0, till.slipCents - (held?.slipCents ?? 0)),
    checkCents: Math.max(0, till.checkCents - (held?.checkCents ?? 0)),
    creditCents: till.creditCents,
    eWalletCents: Math.max(0, till.eWalletCents - (held?.eWalletCents ?? 0)),
  }
}

/** Methods where entered is greater than available. Shortfalls are allowed. */
export function getHandoverAmountOvers(
  entered: HandoverMethodAmounts,
  available: HandoverMethodAmounts
): HandoverAmountOver[] {
  const overs: HandoverAmountOver[] = []
  for (const key of HANDOVER_AMOUNT_METHOD_KEYS) {
    const enteredCents = entered[key] ?? 0
    const availableCents = available[key] ?? 0
    if (enteredCents > availableCents) {
      overs.push({
        key,
        label: HANDOVER_AMOUNT_METHOD_LABELS[key],
        enteredCents,
        availableCents,
      })
    }
  }
  return overs
}

export function formatHandoverOverAmountError(
  overs: HandoverAmountOver[],
  context: "submit" | "approve"
): string {
  if (overs.length === 0) return ""
  const details = overs
    .map(
      (m) =>
        `${m.label}: entered ${formatCents(m.enteredCents)}, available ${formatCents(m.availableCents)}`
    )
    .join("; ")
  if (context === "submit") {
    return `Cannot hand over more than the till holds. ${details}. You may hand over less than available, but not more.`
  }
  return `Cannot approve this handover: amounts exceed the sender's available till. ${details}. Reject the handover so the sender can resubmit with amounts that do not exceed the till.`
}

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
