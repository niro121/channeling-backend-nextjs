"use server"

import prisma from "@/lib/prisma"
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from "@/types/handover"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import { REFERENCE_TYPES } from "@/types/accounting"
import {
  getIncludedHandoversChain,
  getFullChainByForwardedTo,
  type IncludedHandoverForDisplay,
} from "@/services/shift-handover.service"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import { createJournalEntry } from "@/services/accounting.service"
import { createAccount } from "@/services/accounting/account.service"
import { PAYMENT_METHOD_NAMES } from "@/types/receipt"
import { receiptAmountToCents } from "@/lib/format-money"
import { z } from "zod"

const NON_CASH_METHODS = [
  RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
  RECEIPT_PAYMENT_METHOD.SLIP,
  RECEIPT_PAYMENT_METHOD.CHECK,
  RECEIPT_PAYMENT_METHOD.E_WALLET,
] as const

/** Receipt row for reconciliation tick list */
export type ReceiptForReconciliation = {
  id: string
  receiptNoString: string
  paymentMethod: number
  amount: number
  type: number
  createdAt: Date
  cardReference: string
  slipReference: string
  /** When set, UI should show this receipt as pre-ticked (already reconciled for this handover). */
  reconciledAt?: Date | null
  reconciledBy?: string | null
}

/**
 * Get receipts eligible for reconciliation for a handover.
 * Uses shiftId when set on receipts; otherwise falls back to createdBy + time window (legacy).
 * Filters in memory for canceledAt/reconciledAt so MongoDB null/missing optional fields match reliably.
 * Includes receipts already reconciled for this handover (reconciledHandoverId = handoverId) so UI can show them pre-ticked.
 */
export async function getReceiptsForHandoverReconciliation(
  shiftId: string,
  fromUserId: string,
  shiftStartedAt: Date,
  handoverCreatedAt: Date,
  handoverId: string
): Promise<ReceiptForReconciliation[]> {
  // Query: shiftId or legacy window, and non-cash only. Do NOT filter canceledAt/reconciledAt in DB
  // so that MongoDB null vs missing field doesn't exclude valid receipts; we filter in memory.
  const raw = await prisma.receipt.findMany({
    where: {
      OR: [
        { shiftId },
        {
          shiftId: null,
          createdBy: fromUserId,
          createdAt: { gte: shiftStartedAt, lte: handoverCreatedAt },
        },
      ],
      paymentMethod: { in: [...NON_CASH_METHODS] },
    },
    select: {
      id: true,
      receiptNoString: true,
      paymentMethod: true,
      amount: true,
      type: true,
      createdAt: true,
      cardReference: true,
      slipReference: true,
      canceledAt: true,
      reconciledAt: true,
      reconciledBy: true,
      reconciledHandoverId: true,
    },
    orderBy: { createdAt: "asc" },
  })
  const eligible = raw.filter(
    (r) =>
      (r.canceledAt === null || r.canceledAt === undefined) &&
      (r.reconciledAt === null || r.reconciledAt === undefined || r.reconciledHandoverId === handoverId)
  )
  return eligible.map((r) => ({
    id: r.id,
    receiptNoString: r.receiptNoString,
    paymentMethod: r.paymentMethod,
    amount: r.amount,
    type: r.type,
    createdAt: r.createdAt,
    cardReference: r.cardReference,
    slipReference: r.slipReference,
    reconciledAt: r.reconciledAt ?? undefined,
    reconciledBy: r.reconciledBy ?? undefined,
  }))
}

/** Net amount in cents for a payment method from receipt list (DEBIT - CREDIT). Normalizes receipt amount to cents. */
function netAmountByMethod(
  receipts: { paymentMethod: number; amount: number; type: number }[],
  method: number
): number {
  return receipts
    .filter((r) => r.paymentMethod === method)
    .reduce((sum, r) => sum + (r.type === 1 ? receiptAmountToCents(r.amount) : -receiptAmountToCents(r.amount)), 0)
}

/** Handover row for reconciliation list (top-level only) */
export type HandoverForReconciliationList = {
  id: string
  createdAt: Date
  cardCents: number
  slipCents: number
  checkCents: number
  eWalletCents: number
  totalNonCashCents: number
  reconciliationStatus: number | null
  reconciliationRejectReason: string | null
  fromUser: { id: string; name: string | null; staff: { code: string } | null }
  toUser: { id: string; name: string | null }
  shift: { id: string; startedAt: Date; userId: string }
}

export type ReconciliationListTab = "reconciliation" | "approved" | "rejected"

const reconciliationListSelect = {
  id: true,
  createdAt: true,
  cardCents: true,
  slipCents: true,
  checkCents: true,
  eWalletCents: true,
  fromUserId: true,
  toUserId: true,
  nonCashReconciledAt: true,
  reconciliationStatus: true,
  reconciliationRejectReason: true,
  forwardedToHandoverId: true,
  fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
  toUser: { select: { id: true, name: true } },
  shift: { select: { id: true, startedAt: true, userId: true } },
} as const

function buildWhereForTab(tab: ReconciliationListTab) {
  const baseApproved = { status: HANDOVER_STATUS.APPROVED }
  switch (tab) {
    case "reconciliation":
      // Only handovers already sent to reconciliation (IN_RECONCILIATION). Exclude PENDING (not yet sent).
      return {
        ...baseApproved,
        OR: [
          { reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION },
          { reconciliationStatus: null },
        ],
      }
    case "approved":
      return { ...baseApproved, reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED }
    case "rejected":
      return { ...baseApproved, reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_REJECTED }
    default:
      return {
        ...baseApproved,
        OR: [
          { reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION },
          { reconciliationStatus: null },
        ],
      }
  }
}

/** List handovers by tab with DB-level pagination. Optional filters: date range (handover date), fromUserId, toUserId. */
export async function listHandoversForReconciliation(params: {
  page?: number
  limit?: number
  keyword?: string
  tab?: ReconciliationListTab
  dateFrom?: string | null
  dateTo?: string | null
  fromUserId?: string | null
  toUserId?: string | null
}): Promise<{ data: HandoverForReconciliationList[]; totalRecords: number }> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 20))
  const skip = (page - 1) * limit
  const tab = params.tab ?? "reconciliation"
  const where = buildWhereForTab(tab)

  const and: Record<string, unknown>[] = []

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? new Date(params.dateFrom + "T00:00:00.000Z") : undefined
    const to = params.dateTo ? new Date(params.dateTo + "T23:59:59.999Z") : undefined
    if (from && to) and.push({ createdAt: { gte: from, lte: to } })
    else if (from) and.push({ createdAt: { gte: from } })
    else if (to) and.push({ createdAt: { lte: to } })
  }
  if (params.fromUserId && params.fromUserId !== "__all__") and.push({ fromUserId: params.fromUserId })
  if (params.toUserId && params.toUserId !== "__all__") and.push({ toUserId: params.toUserId })

  const finalWhere = and.length > 0 ? { AND: [where, ...and] } : where

  const orderBy =
    tab === "approved"
      ? { nonCashReconciledAt: "desc" as const }
      : tab === "rejected"
        ? { reconciliationRejectedAt: "desc" as const }
        : { createdAt: "desc" as const }

  let data: Array<{
    id: string
    createdAt: Date
    cardCents: number
    slipCents: number
    checkCents: number
    eWalletCents: number
    fromUser: { id: string; name: string | null; staff: { code: string } | null }
    toUser: { id: string; name: string | null }
    shift: { id: string; startedAt: Date; userId: string }
    reconciliationStatus: number | null
    reconciliationRejectReason: string | null
    forwardedToHandoverId?: string | null
  }>
  let totalRecords: number

  // For all tabs: fetch by status then filter to top-level in code so MongoDB "missing" forwardedToHandoverId is included
  const all = await prisma.shiftHandover.findMany({
    where: finalWhere,
    orderBy,
    select: reconciliationListSelect,
  })
  const topLevel = all.filter((h) => h.forwardedToHandoverId == null)
  totalRecords = topLevel.length
  data = topLevel.slice(skip, skip + limit)

  const rows: HandoverForReconciliationList[] = data.map((h) => ({
    id: h.id,
    createdAt: h.createdAt,
    cardCents: h.cardCents,
    slipCents: h.slipCents,
    checkCents: h.checkCents,
    eWalletCents: h.eWalletCents,
    totalNonCashCents: h.cardCents + h.slipCents + h.checkCents + h.eWalletCents,
    reconciliationStatus: h.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING,
    reconciliationRejectReason: h.reconciliationRejectReason ?? null,
    fromUser: h.fromUser,
    toUser: h.toUser,
    shift: h.shift,
  }))

  return { data: rows, totalRecords }
}

/** User options for filter dropdowns (handed over by / handed over to). */
export async function getReconciliationUserOptions(): Promise<{ id: string; name: string }[]> {
  const users = await prisma.user.findMany({
    where: { status: 1 },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  })
  return users.map((u) => ({ id: u.id, name: u.name || u.id }))
}

/** Cashier-entered entries at handover (reference + amount per line) */
export type HandoverEnteredEntries = {
  cardEntries?: { reference: string; amountCents: number }[]
  slipEntries?: { reference: string; amountCents: number }[]
  checkEntries?: { reference: string; amountCents: number }[]
  eWalletEntries?: { reference: string; amountCents: number }[]
}

/** One handover in the chain with its receipts for the document */
export type HandoverTabForReconciliation = {
  handover: {
    id: string
    fromUser: { id: string; name: string | null; staff: { code: string } | null }
    shift: { id: string; startedAt: Date; userId: string }
    cardCents: number
    slipCents: number
    checkCents: number
    eWalletCents: number
    createdAt: Date
    /** Cashier-entered references/amounts at handover (cardEntries, slipEntries, etc.) */
    enteredBreakdown?: HandoverEnteredEntries | null
  }
  receipts: ReceiptForReconciliation[]
}

/** Get full reconciliation document: top-level handover + chain + receipts per handover. When requestedByUserId is passed and status is PENDING, sets IN_RECONCILIATION and reconciliationRequestedBy/At. */
export async function getReconciliationDocument(
  topLevelHandoverId: string,
  requestedByUserId?: string | null
): Promise<
  | { success: true; bulkCashierUserId: string; chain: HandoverTabForReconciliation[] }
  | { success: false; error: string }
> {
  const top = await prisma.shiftHandover.findUnique({
    where: { id: topLevelHandoverId },
    select: {
      id: true,
      toUserId: true,
      status: true,
      nonCashReconciledAt: true,
      reconciliationStatus: true,
      forwardedToHandoverId: true,
      fromUserId: true,
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shiftId: true,
      shift: { select: { id: true, startedAt: true, userId: true } },
      cardCents: true,
      slipCents: true,
      checkCents: true,
      eWalletCents: true,
      createdAt: true,
      includedHandoverIds: true,
      enteredBreakdown: true,
    },
  })

  if (!top) return { success: false, error: "Handover not found." }
  if (top.status !== HANDOVER_STATUS.APPROVED) return { success: false, error: "Handover is not approved." }
  if (top.nonCashReconciledAt) return { success: false, error: "Handover is already reconciled." }
  const reconStatus = top.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED) return { success: false, error: "Handover is already reconciled." }
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_REJECTED) return { success: false, error: "Reconciliation was rejected." }
  if (top.forwardedToHandoverId) return { success: false, error: "Use the top-level handover document, not an included one." }

  // Mark as in reconciliation when bulk cashier opens the document (if still pending); record who requested so we know whose till to deduct
  if (reconStatus === RECONCILIATION_STATUS.PENDING) {
    const now = new Date()
    await prisma.shiftHandover.update({
      where: { id: topLevelHandoverId },
      data: {
        reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION,
        reconciliationRequestedAt: now,
        reconciliationRequestedBy: requestedByUserId ?? undefined,
      },
    })
  }

  let chainHandovers = await getIncludedHandoversChain(top.includedHandoverIds)
  if (chainHandovers.length === 0) {
    chainHandovers = await getFullChainByForwardedTo(topLevelHandoverId)
  }
  const normalizedChain = chainHandovers.map((h: IncludedHandoverForDisplay) => {
    const shift = h.shift as { id: string; startedAt: Date; userId?: string; user?: { id: string } }
    return {
      ...h,
      shift: {
        id: shift.id,
        startedAt: shift.startedAt,
        userId: shift.userId ?? shift.user?.id ?? h.fromUserId,
      },
    }
  })
  const allHandovers: Array<{
    id: string
    fromUserId: string
    fromUser: { id: string; name: string | null; staff: { code: string } | null }
    shift: { id: string; startedAt: Date; userId: string }
    cardCents: number
    slipCents: number
    checkCents: number
    eWalletCents: number
    createdAt: Date
    enteredBreakdown?: unknown
  }> = [top, ...normalizedChain]

  const receiptsByIndex = await Promise.all(
    allHandovers.map((h) => {
      const shiftStartedAt = h.shift?.startedAt ?? h.createdAt
      return getReceiptsForHandoverReconciliation(h.shift.id, h.fromUserId, shiftStartedAt, h.createdAt, h.id)
    })
  )
  const chain: HandoverTabForReconciliation[] = allHandovers.map((h, i) => ({
    handover: {
      id: h.id,
      fromUser: h.fromUser,
      shift: h.shift,
      cardCents: h.cardCents,
      slipCents: h.slipCents,
      checkCents: h.checkCents,
      eWalletCents: h.eWalletCents,
      createdAt: h.createdAt,
      enteredBreakdown: (h.enteredBreakdown as HandoverEnteredEntries | null | undefined) ?? undefined,
    },
    receipts: receiptsByIndex[i] ?? [],
  }))

  return {
    success: true,
    bulkCashierUserId: top.toUserId,
    chain,
  }
}

/**
 * Get or create the single "Reconciled" account for the branch (location).
 * One account per branch; holds verified non-cash after reconciliation.
 * Business rule: this account's balance must not go below zero (other flows that credit it must check before posting).
 */
async function getOrCreateBranchReconciledAccount(locationId: string): Promise<
  { success: true; accountId: string } | { success: false; error: string }
> {
  const name = "Reconciled"
  const code = `REC-${locationId}`
  const existing = await prisma.account.findFirst({
    where: { type: "CASH", locationId, name, isActive: true },
    select: { id: true },
  })
  if (existing) return { success: true, accountId: existing.id }

  const result = await createAccount({
    type: "CASH",
    name,
    code,
    locationId,
  })
  if (!result.success) return { success: false, error: result.error ?? "Failed to create branch reconciled account." }
  return { success: true, accountId: result.account!.id }
}

const submitPayloadSchema = z.object({
  handoverId: z.string().min(1),
  tickedReceiptIdsByHandoverId: z.record(z.string(), z.array(z.string())),
})

export type SubmitReconciliationPayload = z.infer<typeof submitPayloadSchema>

/** Submit reconciliation: transfer only ticked amounts from till to reconciled account (one per bulk cashier). Server-side: already reconciled handovers cannot be reconciled again. */
export async function submitHandoverReconciliation(
  payload: SubmitReconciliationPayload,
  reconciledByUserId: string
): Promise<{ success: true } | { success: false; error: string; issues?: Record<string, string[]> }> {
  const parsed = submitPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid payload.",
      issues: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // Server-side: already reconciled handover cannot be reconciled again; also need branch for Reconciled account
  const topCheck = await prisma.shiftHandover.findUnique({
    where: { id: payload.handoverId },
    select: {
      id: true,
      toUserId: true,
      nonCashReconciledAt: true,
      reconciliationStatus: true,
      reconciliationRequestedBy: true,
      status: true,
      forwardedToHandoverId: true,
      shift: { select: { locationId: true } },
      toUser: { select: { userLocationId: true } },
    },
  })
  if (!topCheck) return { success: false, error: "Handover not found." }
  if (topCheck.status !== HANDOVER_STATUS.APPROVED) return { success: false, error: "Handover is not approved." }
  if (topCheck.nonCashReconciledAt != null) return { success: false, error: "Handover is already reconciled." }
  const reconStatus = topCheck.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED) return { success: false, error: "Handover is already reconciled." }
  if (topCheck.forwardedToHandoverId) return { success: false, error: "Use the top-level handover document." }

  const branchLocationId = topCheck.shift?.locationId ?? topCheck.toUser?.userLocationId ?? null
  if (!branchLocationId) {
    return { success: false, error: "Branch (location) could not be determined for this handover." }
  }

  const doc = await getReconciliationDocument(payload.handoverId)
  if (!doc.success) return doc

  const { chain } = doc
  // Use reconciliation-requested user (who sent/opened reconciliation) so we deduct from their till and credit branch Reconciled account
  const tillUserId = topCheck.reconciliationRequestedBy ?? topCheck.toUserId
  if (!tillUserId) {
    return { success: false, error: "Reconciliation requested user or handover recipient could not be determined." }
  }
  const breakdown = await getTillBalanceBreakdown(tillUserId)
  if (!breakdown.tillAccountId) {
    return { success: false, error: "Bulk cashier till account not found." }
  }

  const tillUser = await prisma.user.findUnique({
    where: { id: tillUserId },
    select: { name: true, staff: { select: { code: true } } },
  })
  const tillUserName = tillUser?.staff?.code
    ? `${tillUser.name ?? "User"} (${tillUser.staff.code})`
    : tillUser?.name ?? "Bulk cashier"

  const topHandover = chain[0]?.handover
  const mainShiftId = topHandover?.shift?.id ?? payload.handoverId
  const mainShiftStartedAt = topHandover?.shift?.startedAt
    ? new Date(topHandover.shift.startedAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : ""

  const now = new Date()
  const allTickedReceiptIds: string[] = []
  for (const tab of chain) {
    const ids = payload.tickedReceiptIdsByHandoverId[tab.handover.id] ?? []
    allTickedReceiptIds.push(...ids)
  }
  if (allTickedReceiptIds.length === 0) {
    return { success: false, error: "Select at least one receipt to reconcile." }
  }

  const reconResult = await getOrCreateBranchReconciledAccount(branchLocationId)
  if (!reconResult.success) return reconResult
  const branchReconciledAccountId = reconResult.accountId

  const methodOrder = [
    RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
    RECEIPT_PAYMENT_METHOD.SLIP,
    RECEIPT_PAYMENT_METHOD.CHECK,
    RECEIPT_PAYMENT_METHOD.E_WALLET,
  ] as const

  for (const tab of chain) {
    const handover = tab.handover
    const tickedIds = payload.tickedReceiptIdsByHandoverId[handover.id] ?? []
    const tickedReceipts = tab.receipts.filter((r) => tickedIds.includes(r.id))
    const amounts: { method: number; amount: number }[] = methodOrder
      .map((method) => ({ method, amount: netAmountByMethod(tickedReceipts, method) }))
      .filter((a) => a.amount > 0)

    if (amounts.length === 0) continue

    const lines: Array<{
      accountId: string
      debitAmount: number
      creditAmount: number
      paymentMethod: number
    }> = []

    for (const { method, amount } of amounts) {
      lines.push({
        accountId: breakdown.tillAccountId,
        debitAmount: 0,
        creditAmount: amount,
        paymentMethod: method,
      })
      lines.push({
        accountId: branchReconciledAccountId,
        debitAmount: amount,
        creditAmount: 0,
        paymentMethod: method,
      })
    }

    const fromLabel = handover.fromUser?.staff?.code
      ? `${handover.fromUser.name ?? "Cashier"} (${handover.fromUser.staff.code})`
      : handover.fromUser?.name ?? "Cashier"
    const methodParts = amounts.map(
      (m) => `${PAYMENT_METHOD_NAMES[m.method] ?? "Method " + m.method}: LKR ${(m.amount / 100).toFixed(2)}`
    )
    const description = `Reconciliation: Main shift ${mainShiftId}${mainShiftStartedAt ? ` (started ${mainShiftStartedAt})` : ""}, till: ${tillUserName}. From ${fromLabel} handover: ${methodParts.join(", ")} → branch Reconciled account.`

    const journalResult = await createJournalEntry({
      date: now,
      description,
      referenceType: REFERENCE_TYPES.ShiftHandover,
      referenceId: payload.handoverId,
      createdBy: reconciledByUserId,
      lines,
    })

    if (!journalResult.success) {
      return { success: false, error: journalResult.error ?? "Failed to create journal entry." }
    }
  }

  // Update only the top-level (last) handover document with reconciled result; chain handovers stay as-is for audit.
  await prisma.shiftHandover.update({
    where: { id: payload.handoverId },
    data: {
      nonCashReconciledAt: now,
      nonCashReconciledBy: reconciledByUserId,
      reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED,
    },
  })
  // Mark included handovers in the chain as reconciled so they don't show in pending list.
  const includedIds = chain.map((t) => t.handover.id).filter((id) => id !== payload.handoverId)
  if (includedIds.length > 0) {
    await prisma.shiftHandover.updateMany({
      where: { id: { in: includedIds } },
      data: { reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED },
    })
  }

  if (allTickedReceiptIds.length > 0) {
    await prisma.receipt.updateMany({
      where: { id: { in: allTickedReceiptIds } },
      data: {
        reconciledAt: now,
        reconciledBy: reconciledByUserId,
        reconciledHandoverId: payload.handoverId,
      },
    })
  }

  return { success: true }
}

/** Mark a handover as sent to reconciliation (IN_RECONCILIATION) with requestedBy/At. Only for top-level, approved, not-yet-reconciled handovers that the current user received. */
export async function sendHandoverToReconciliation(
  handoverId: string,
  requestedByUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    select: {
      id: true,
      toUserId: true,
      status: true,
      nonCashReconciledAt: true,
      reconciliationStatus: true,
      forwardedToHandoverId: true,
    },
  })
  if (!handover) return { success: false, error: "Handover not found." }
  if (handover.toUserId !== requestedByUserId) return { success: false, error: "Only the recipient can send this handover to reconciliation." }
  if (handover.status !== HANDOVER_STATUS.APPROVED) return { success: false, error: "Handover is not approved." }
  if (handover.nonCashReconciledAt) return { success: false, error: "Handover is already reconciled." }
  const reconStatus = handover.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED) return { success: false, error: "Handover is already reconciled." }
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_REJECTED) return { success: false, error: "Reconciliation was rejected." }
  if (reconStatus === RECONCILIATION_STATUS.IN_RECONCILIATION) return { success: false, error: "Handover is already in reconciliation." }
  if (handover.forwardedToHandoverId) return { success: false, error: "Use the top-level handover, not an included one." }

  const now = new Date()
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: {
      reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION,
      reconciliationRequestedAt: now,
      reconciliationRequestedBy: requestedByUserId,
    },
  })
  return { success: true }
}

/** Reject reconciliation for a handover (and its chain). Sets reconciliationStatus = RECONCILED_REJECTED with reason. */
export async function rejectHandoverReconciliation(
  topLevelHandoverId: string,
  reason: string,
  rejectedByUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const top = await prisma.shiftHandover.findUnique({
    where: { id: topLevelHandoverId },
    select: {
      id: true,
      status: true,
      nonCashReconciledAt: true,
      reconciliationStatus: true,
      forwardedToHandoverId: true,
      includedHandoverIds: true,
    },
  })
  if (!top) return { success: false, error: "Handover not found." }
  if (top.status !== HANDOVER_STATUS.APPROVED) return { success: false, error: "Handover is not approved." }
  if (top.nonCashReconciledAt) return { success: false, error: "Handover is already reconciled." }
  const reconStatus = top.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED) return { success: false, error: "Handover is already reconciled." }
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_REJECTED) return { success: false, error: "Reconciliation was already rejected." }
  if (top.forwardedToHandoverId) return { success: false, error: "Use the top-level handover document." }
  const trimmedReason = (reason ?? "").trim()
  if (!trimmedReason) return { success: false, error: "Rejection reason is required." }

  const chainHandovers = await getIncludedHandoversChain(top.includedHandoverIds)
  const handoverIds = [top.id, ...chainHandovers.map((h: { id: string }) => h.id)]
  const now = new Date()
  await prisma.shiftHandover.updateMany({
    where: { id: { in: handoverIds } },
    data: {
      reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_REJECTED,
      reconciliationRejectedAt: now,
      reconciliationRejectedBy: rejectedByUserId,
      reconciliationRejectReason: trimmedReason,
    },
  })
  return { success: true }
}
