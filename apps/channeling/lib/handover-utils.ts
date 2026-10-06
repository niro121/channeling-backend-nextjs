import { formatCents } from "@/lib/format-money"
import { FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { RECONCILIATION_STATUS } from "@/types/handover"

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

/** 1 LKR: ignore tiny rounding when deciding if collection excess needs a reason. */
export const HANDOVER_EXCESS_THRESHOLD_CENTS = 100

export type HandoverExpectedCollectionParts = {
  floatsInCents: number
  floatsOutCents: number
  summaryCents: number
  previousHandoversCents: number
  /** Non-cash on handovers already sent to reconciliation. Stays with this cashier. */
  sentToReconciliationCents?: number
}

export type ExpectedHandoverCollectionSourceRow = {
  id: string
  label: string
  cents: number
}

export type ExpectedHandoverCollection = HandoverExpectedCollectionParts & {
  expectedCents: number
  previousHandovers: ExpectedHandoverCollectionSourceRow[]
  sentToReconciliation: ExpectedHandoverCollectionSourceRow[]
  floatsIn: ExpectedHandoverCollectionSourceRow[]
  floatsOut: ExpectedHandoverCollectionSourceRow[]
}

/**
 * Non-cash already with reconciliation is not handed to the next cashier.
 * Cash from that handover stays in the till and is still handed over.
 */
export function isHandoverHeldForReconciliation(reconciliationStatus: number | null | undefined): boolean {
  const status = Number(reconciliationStatus ?? RECONCILIATION_STATUS.PENDING)
  return (
    status === RECONCILIATION_STATUS.IN_RECONCILIATION ||
    status === RECONCILIATION_STATUS.RECONCILED_APPROVED
  )
}

export function handoverNonCashHeldCents(handover: {
  reconciliationStatus?: number | null
  cardCents?: number | null
  slipCents?: number | null
  checkCents?: number | null
  eWalletCents?: number | null
}): number {
  if (!isHandoverHeldForReconciliation(handover.reconciliationStatus)) return 0
  return (
    (handover.cardCents ?? 0) +
    (handover.slipCents ?? 0) +
    (handover.checkCents ?? 0) +
    (handover.eWalletCents ?? 0)
  )
}

/** Total Collection: floats in + summary + previous handovers − sent to reconciliation − floats out. */
export function expectedHandoverCollectionCents(parts: HandoverExpectedCollectionParts): number {
  return (
    parts.floatsInCents +
    parts.summaryCents +
    parts.previousHandoversCents -
    (parts.sentToReconciliationCents ?? 0) -
    parts.floatsOutCents
  )
}

export function handoverAmountsTotalCents(amounts: HandoverMethodAmounts): number {
  return HANDOVER_AMOUNT_METHOD_KEYS.reduce((sum, key) => sum + (amounts[key] ?? 0), 0)
}

export const EMPTY_HANDOVER_AMOUNTS: HandoverMethodAmounts = {
  cashCents: 0,
  cardCents: 0,
  slipCents: 0,
  checkCents: 0,
  creditCents: 0,
  eWalletCents: 0,
}

/** How much of each method was not handed over and is still on the till. */
export function handoverTillGaps(
  entered: HandoverMethodAmounts,
  available: HandoverMethodAmounts
): HandoverMethodAmounts {
  const gaps = { ...EMPTY_HANDOVER_AMOUNTS }
  for (const key of HANDOVER_AMOUNT_METHOD_KEYS) {
    gaps[key] = Math.max(0, (available[key] ?? 0) - (entered[key] ?? 0))
  }
  return gaps
}

/** A marked short cannot be more than the amount left in the till for that method. */
export function handoverShortsExceedingTillGap(
  shorts: HandoverMethodAmounts,
  entered: HandoverMethodAmounts,
  available: HandoverMethodAmounts
): HandoverAmountOver[] {
  const gaps = handoverTillGaps(entered, available)
  const overs: HandoverAmountOver[] = []
  for (const key of HANDOVER_AMOUNT_METHOD_KEYS) {
    const enteredCents = shorts[key] ?? 0
    const availableCents = gaps[key] ?? 0
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

export function formatHandoverShortExceedsGapError(overs: HandoverAmountOver[]): string {
  if (overs.length === 0) return ""
  const details = overs
    .map(
      (m) =>
        `${m.label}: short ${formatCents(m.enteredCents)}, left in till ${formatCents(m.availableCents)}`
    )
    .join("; ")
  return `A short cannot be more than the amount left in the till. ${details}.`
}

/** Entered handover total minus expected Total Collection. Positive = excess, negative = short. */
export function handoverCollectionDiffCents(enteredTotalCents: number, expectedCents: number): number {
  return enteredTotalCents - expectedCents
}

export function isHandoverCollectionExcess(diffCents: number): boolean {
  return diffCents > HANDOVER_EXCESS_THRESHOLD_CENTS
}

export function sumReceivedHandoverFloats(
  floats: Array<{ direction?: string | null; status: number; amountReceivedCents?: number | null }>
): { floatsInCents: number; floatsOutCents: number } {
  let floatsInCents = 0
  let floatsOutCents = 0
  for (const f of floats) {
    if (f.status !== FLOAT_REQUEST_STATUS.RECEIVED) continue
    const amount = f.amountReceivedCents ?? 0
    if (f.direction === "out") floatsOutCents += amount
    else floatsInCents += amount
  }
  return { floatsInCents, floatsOutCents }
}

export function handoverDiscrepancyReasonLabel(opts: { hasShort: boolean; hasExcess: boolean }): string {
  if (opts.hasShort && opts.hasExcess) return "Reason for discrepancy"
  if (opts.hasExcess) return "Reason for excess"
  return "Reason for short"
}

export function handoverDiscrepancyReasonPlaceholder(opts: { hasShort: boolean; hasExcess: boolean }): string {
  if (opts.hasExcess && !opts.hasShort) {
    return "e.g. Extra cash not in summary or previous handovers…"
  }
  if (opts.hasShort && !opts.hasExcess) {
    return "e.g. Counting difference, missing slip…"
  }
  return "e.g. Counting difference, extra cash, missing slip…"
}

export function handoverDiscrepancyReasonRequiredMessage(opts: {
  hasShort: boolean
  hasExcess: boolean
}): string {
  if (opts.hasShort && opts.hasExcess) return "Please provide a reason for the discrepancy."
  if (opts.hasExcess) return "Please provide a reason for the excess."
  return "Please provide a reason for the short."
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
