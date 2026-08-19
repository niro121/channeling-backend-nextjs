"use server"

import prisma from "@/lib/prisma"
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from "@/types/handover"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import { REFERENCE_TYPES } from "@/types/accounting"
import {
  getIncludedHandoversChain,
  getFullChainByForwardedTo,
  getPreviousHandoversForHandoverDetail,
  type IncludedHandoverForDisplay,
} from "@/services/shift-handover.service"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import { createJournalEntry } from "@/services/accounting.service"
import { createAccount } from "@/services/accounting/account.service"
import { PAYMENT_METHOD_NAMES } from "@/types/receipt"
import { receiptAmountToCents } from "@/lib/format-money"
import { formatSlipDate } from "@/lib/slip-date"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { hasPermission } from "@/lib/permissions"
import { userTypes } from "@/lib/roles"
import { createNotification } from "@/services/notification.service"
import { NOTIFICATION_TYPES, REFERENCE_TYPES as NOTIF_REF_TYPES } from "@/types/notification"
import type { Permissions } from "@/types/user-group"
import { z } from "zod"

const NON_CASH_METHODS = [
  RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
  RECEIPT_PAYMENT_METHOD.SLIP,
  RECEIPT_PAYMENT_METHOD.CHECK,
  RECEIPT_PAYMENT_METHOD.E_WALLET,
] as const

const NON_CASH_METHOD_SET = new Set<number>(NON_CASH_METHODS)

/** Receipt row for reconciliation tick list */
export type ReceiptForReconciliation = {
  id: string
  /** Parent receipt ID (same as id for non-mixed; the receipt ObjectId for mixed payment line rows). */
  receiptId: string
  receiptNoString: string
  paymentMethod: number
  amount: number
  type: number
  createdAt: Date
  cardReference: string
  slipReference: string
  /** YYYY-MM-DD when set */
  slipDate: string | null
  /** When set, UI should show this receipt as pre-ticked (already reconciled for this handover). */
  reconciledAt?: Date | null
  reconciledBy?: string | null
  cannotReconcileAt?: Date | null
  cannotReconcileReason?: string | null
}

export type ReconciliationJournalLine = {
  accountName: string
  debitAmount: number
  creditAmount: number
  paymentMethod: number | null
}

export type ReconciliationJournal = {
  id: string
  journalNumber: number | null
  date: Date
  description: string
  lines: ReconciliationJournalLine[]
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
      paymentMethod: { in: [...NON_CASH_METHODS, RECEIPT_PAYMENT_METHOD.MIXED] },
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
      slipDate: true,
      canceledAt: true,
      reconciledAt: true,
      reconciledBy: true,
      reconciledHandoverId: true,
      cannotReconcileAt: true,
      cannotReconcileBy: true,
      cannotReconcileReason: true,
      paymentLines: {
        select: {
          id: true,
          paymentMethod: true,
          amount: true,
          cardReference: true,
          slipReference: true,
          slipDate: true,
          reconciledAt: true,
          reconciledBy: true,
          cannotReconcileAt: true,
          cannotReconcileBy: true,
          cannotReconcileReason: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })
  const eligible = raw.filter((r) => {
    if (r.canceledAt) return false
    if (r.reconciledHandoverId && r.reconciledHandoverId !== handoverId) return false
    if (!r.reconciledHandoverId && (r.reconciledAt || r.cannotReconcileAt)) return false
    return true
  })
  const result: ReceiptForReconciliation[] = []
  for (const r of eligible) {
    const parentReconciled = r.reconciledAt ?? undefined
    const parentCannotAt = r.cannotReconcileAt ?? undefined
    const parentCannotReason = r.cannotReconcileReason ?? undefined
    if (r.paymentMethod === RECEIPT_PAYMENT_METHOD.MIXED && r.paymentLines.length > 0) {
      for (const line of r.paymentLines) {
        if (!NON_CASH_METHOD_SET.has(line.paymentMethod)) continue
        const lineCannotAt = line.cannotReconcileAt ?? (line.reconciledAt ? undefined : parentCannotAt)
        const lineCannotReason = line.cannotReconcileReason ?? (lineCannotAt ? parentCannotReason : undefined)
        const lineReconciled = lineCannotAt ? undefined : (line.reconciledAt ?? parentReconciled)
        result.push({
          id: line.id,
          receiptId: r.id,
          receiptNoString: r.receiptNoString,
          paymentMethod: line.paymentMethod,
          amount: line.amount,
          type: r.type,
          createdAt: r.createdAt,
          cardReference: line.cardReference ?? "",
          slipReference: line.slipReference ?? "",
          slipDate: formatSlipDate(line.slipDate) ?? null,
          reconciledAt: lineReconciled,
          reconciledBy: line.reconciledBy ?? r.reconciledBy ?? undefined,
          cannotReconcileAt: lineCannotAt,
          cannotReconcileReason: lineCannotReason,
        })
      }
    } else {
      result.push({
        id: r.id,
        receiptId: r.id,
        receiptNoString: r.receiptNoString,
        paymentMethod: r.paymentMethod,
        amount: r.amount,
        type: r.type,
        createdAt: r.createdAt,
        cardReference: r.cardReference,
        slipReference: r.slipReference,
        slipDate: formatSlipDate(r.slipDate) ?? null,
        reconciledAt: parentReconciled,
        reconciledBy: r.reconciledBy ?? undefined,
        cannotReconcileAt: parentCannotAt,
        cannotReconcileReason: parentCannotReason,
      })
    }
  }
  return result
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
  handoverNoString: string | null
  cardCents: number
  slipCents: number
  checkCents: number
  eWalletCents: number
  totalNonCashCents: number
  reconciliationStatus: number | null
  reconciliationRejectReason: string | null
  reconciliationAssignedToUserId?: string | null
  reconciliationRequestedAt: Date | null
  nonCashReconciledAt: Date | null
  reconciliationRejectedAt: Date | null
  actedByUser: { id: string; name: string | null; staff: { code: string } | null } | null
  hasReconciliationIssues: boolean
  fromUser: { id: string; name: string | null; staff: { code: string } | null }
  toUser: { id: string; name: string | null }
  shift: { id: string; startedAt: Date; userId: string }
}

export type ReconciliationListTab = "reconciliation" | "approved" | "rejected"

const reconciliationListSelect = {
  id: true,
  createdAt: true,
  handoverNoString: true,
  cardCents: true,
  slipCents: true,
  checkCents: true,
  eWalletCents: true,
  fromUserId: true,
  toUserId: true,
  nonCashReconciledAt: true,
  nonCashReconciledBy: true,
  reconciliationStatus: true,
  reconciliationRejectReason: true,
  hasReconciliationIssues: true,
  reconciliationAssignedToUserId: true,
  reconciliationRequestedAt: true,
  reconciliationRejectedAt: true,
  reconciliationRejectedBy: true,
  forwardedToHandoverId: true,
  fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
  toUser: { select: { id: true, name: true } },
  shift: { select: { id: true, startedAt: true, userId: true } },
} as const

function buildWhereForTab(tab: ReconciliationListTab) {
  const baseApproved = { status: HANDOVER_STATUS.APPROVED }
  switch (tab) {
    case "reconciliation":
      // Only handovers explicitly sent to reconciliation (IN_RECONCILIATION).
      return {
        ...baseApproved,
        reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION,
      }
    case "approved":
      return { ...baseApproved, reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED }
    case "rejected":
      return { ...baseApproved, reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_REJECTED }
    default:
      return {
        ...baseApproved,
        reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION,
      }
  }
}

/** List handovers by tab with DB-level pagination. Optional filters: date range, fromUserId, toUserId, assignedToUserId (restrict to assignee). */
export async function listHandoversForReconciliation(params: {
  page?: number
  limit?: number
  keyword?: string
  tab?: ReconciliationListTab
  dateFrom?: string | null
  dateTo?: string | null
  fromUserId?: string | null
  toUserId?: string | null
  /** When set, only handovers assigned to this user (or legacy unassigned) are returned for the open tab. */
  assignedToUserId?: string | null
  /** Admin bypass: do not filter by assignee. */
  viewAllAssigned?: boolean
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
  if (!params.viewAllAssigned && params.assignedToUserId) {
    and.push({ reconciliationAssignedToUserId: params.assignedToUserId })
  }

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
    handoverNoString?: string | null
    cardCents: number
    slipCents: number
    checkCents: number
    eWalletCents: number
    fromUser: { id: string; name: string | null; staff: { code: string } | null }
    toUser: { id: string; name: string | null }
    shift: { id: string; startedAt: Date; userId: string }
    reconciliationStatus: number | null
    reconciliationRejectReason: string | null
    reconciliationAssignedToUserId?: string | null
    hasReconciliationIssues?: boolean | null
    reconciliationRequestedAt?: Date | null
    nonCashReconciledAt?: Date | null
    nonCashReconciledBy?: string | null
    reconciliationRejectedAt?: Date | null
    reconciliationRejectedBy?: string | null
    forwardedToHandoverId?: string | null
  }>
  let totalRecords: number

  // For all tabs: fetch by status then filter to top-level in code so MongoDB "missing" forwardedToHandoverId is included
  const all = await prisma.shiftHandover.findMany({
    where: finalWhere,
    orderBy,
    select: reconciliationListSelect,
  })
  let topLevel = all.filter((h) => h.forwardedToHandoverId == null)
  // Legacy rows without assignee: include for assignee filter only if assignedToUserId matches requestedBy fallback is not applied — exclude unassigned from personal queue
  if (!params.viewAllAssigned && params.assignedToUserId) {
    topLevel = topLevel.filter((h) => h.reconciliationAssignedToUserId === params.assignedToUserId)
  }
  totalRecords = topLevel.length
  data = topLevel.slice(skip, skip + limit)

  const actorIds = [
    ...new Set(
      data
        .flatMap((h) => [
          h.nonCashReconciledBy,
          h.reconciliationRejectedBy,
          h.reconciliationAssignedToUserId,
        ])
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : []
  const actorById = new Map(actors.map((u) => [u.id, u]))

  const rows: HandoverForReconciliationList[] = data.map((h) => {
    const status = h.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
    const actedById =
      status === RECONCILIATION_STATUS.RECONCILED_APPROVED
        ? h.nonCashReconciledBy
        : status === RECONCILIATION_STATUS.RECONCILED_REJECTED
          ? h.reconciliationRejectedBy
          : h.reconciliationAssignedToUserId
    return {
      id: h.id,
      createdAt: h.createdAt,
      handoverNoString: h.handoverNoString ?? null,
      cardCents: h.cardCents,
      slipCents: h.slipCents,
      checkCents: h.checkCents,
      eWalletCents: h.eWalletCents,
      totalNonCashCents: h.cardCents + h.slipCents + h.checkCents + h.eWalletCents,
      reconciliationStatus: status,
      reconciliationRejectReason: h.reconciliationRejectReason ?? null,
      reconciliationAssignedToUserId: h.reconciliationAssignedToUserId ?? null,
      reconciliationRequestedAt: h.reconciliationRequestedAt ?? null,
      nonCashReconciledAt: h.nonCashReconciledAt ?? null,
      reconciliationRejectedAt: h.reconciliationRejectedAt ?? null,
      actedByUser: actedById ? actorById.get(actedById) ?? null : null,
      hasReconciliationIssues: Boolean(h.hasReconciliationIssues),
      fromUser: h.fromUser,
      toUser: h.toUser,
      shift: h.shift,
    }
  })

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

/** Users who can be assigned to reconcile — only Approve Reconciliation permission (or admin). */
export async function getReconcilerUserOptions(): Promise<
  { id: string; name: string; email: string; staffCode: string | null }[]
> {
  const [groups, admins] = await Promise.all([
    prisma.userGroup.findMany({
      where: { status: 1 },
      select: { id: true, permissions: true },
    }),
    prisma.user.findMany({
      where: { status: 1, userType: userTypes.admin },
      select: { id: true, name: true, email: true, staff: { select: { code: true } } },
      orderBy: { name: "asc" },
    }),
  ])

  const groupIds = groups
    .filter((g) => hasPermission(g.permissions as Permissions | null, "reconciliation", "approve-reconciliation"))
    .map((g) => g.id)

  const fromGroups =
    groupIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { status: 1, userGroupId: { in: groupIds } },
          select: { id: true, name: true, email: true, staff: { select: { code: true } } },
          orderBy: { name: "asc" },
        })

  const byId = new Map<string, { id: string; name: string; email: string; staffCode: string | null }>()
  for (const u of [...fromGroups, ...admins]) {
    byId.set(u.id, {
      id: u.id,
      name: u.name || u.email || u.id,
      email: u.email,
      staffCode: u.staff?.code ?? null,
    })
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )
}

/** Get full reconciliation document: top-level handover + chain + receipts per handover. Does not auto-send to reconciliation. */
export async function getReconciliationDocument(
  topLevelHandoverId: string,
  _requestedByUserId?: string | null
): Promise<
  | {
      success: true
      bulkCashierUserId: string
      chain: HandoverTabForReconciliation[]
      reconciliationAssignedToUserId: string | null
      reconciliationStatus: number
      reconciliationRejectReason: string | null
      handoverNoString: string | null
      hasReconciliationIssues: boolean
    }
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
      reconciliationAssignedToUserId: true,
      reconciliationRejectReason: true,
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
      handoverNoString: true,
      hasReconciliationIssues: true,
    },
  })

  if (!top) return { success: false, error: "Handover not found." }
  if (top.status !== HANDOVER_STATUS.APPROVED) return { success: false, error: "Handover is not approved." }
  const reconStatus = top.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  const canViewDocument =
    reconStatus === RECONCILIATION_STATUS.IN_RECONCILIATION ||
    reconStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED ||
    reconStatus === RECONCILIATION_STATUS.RECONCILED_REJECTED
  if (!canViewDocument) {
    return { success: false, error: "Handover has not been sent to reconciliation yet." }
  }
  if (top.forwardedToHandoverId) return { success: false, error: "Use the top-level handover document, not an included one." }

  let chainHandovers = await getPreviousHandoversForHandoverDetail({
    handoverId: topLevelHandoverId,
    shiftId: top.shiftId,
    includedHandoverIds: top.includedHandoverIds,
  })
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
  }> = [top, ...normalizedChain.filter((h) => h.id !== top.id)]

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
    reconciliationAssignedToUserId: top.reconciliationAssignedToUserId ?? null,
    reconciliationStatus: reconStatus,
    reconciliationRejectReason: top.reconciliationRejectReason ?? null,
    handoverNoString: top.handoverNoString ?? null,
    hasReconciliationIssues: Boolean(top.hasReconciliationIssues),
    chain,
  }
}

/** Journals posted for this handover (double entries). Loaded on demand. */
export async function getReconciliationJournals(
  handoverId: string
): Promise<{ success: true; journals: ReconciliationJournal[] } | { success: false; error: string }> {
  if (!handoverId?.trim()) return { success: false, error: "Handover not found." }
  const journalsRaw = await prisma.journal.findMany({
    where: {
      referenceId: handoverId,
      OR: [
        { referenceType: REFERENCE_TYPES.Reconciliation },
        {
          referenceType: REFERENCE_TYPES.ShiftHandover,
          description: { startsWith: "Reconciliation" },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      journalNumber: true,
      date: true,
      description: true,
      journalLines: {
        select: {
          debitAmount: true,
          creditAmount: true,
          paymentMethod: true,
          account: { select: { name: true, code: true } },
        },
      },
    },
  })
  return {
    success: true,
    journals: journalsRaw.map((j) => ({
      id: j.id,
      journalNumber: j.journalNumber ?? null,
      date: j.date,
      description: j.description,
      lines: j.journalLines.map((l) => ({
        accountName: l.account.code ? `${l.account.name} (${l.account.code})` : l.account.name,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
        paymentMethod: l.paymentMethod ?? null,
      })),
    })),
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
  cannotReconcileByHandoverId: z
    .record(z.string(), z.array(z.object({ id: z.string().min(1), reason: z.string().min(1) })))
    .optional(),
})

export type SubmitReconciliationPayload = z.infer<typeof submitPayloadSchema>

function isReceiptRowProcessed(r: ReceiptForReconciliation): boolean {
  return Boolean(r.reconciledAt || r.cannotReconcileAt)
}

/** Submit a batch: transfer newly ticked / cannot-reconcile amounts from till. Handover stays open until every line is handled. */
export async function submitHandoverReconciliation(
  payload: SubmitReconciliationPayload,
  reconciledByUserId: string
): Promise<
  | { success: true; complete: boolean; remainingCount: number; postedCount: number }
  | { success: false; error: string; issues?: Record<string, string[]> }
> {
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
      reconciliationAssignedToUserId: true,
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
  if (reconStatus !== RECONCILIATION_STATUS.IN_RECONCILIATION) {
    return { success: false, error: "Handover has not been sent to reconciliation." }
  }
  if (topCheck.forwardedToHandoverId) return { success: false, error: "Use the top-level handover document." }
  const actor = await prisma.user.findUnique({
    where: { id: reconciledByUserId },
    select: { userType: true },
  })
  const isAdmin = actor?.userType === 1
  if (
    !isAdmin &&
    topCheck.reconciliationAssignedToUserId &&
    topCheck.reconciliationAssignedToUserId !== reconciledByUserId
  ) {
    return { success: false, error: "Only the assigned reconciler can submit this reconciliation." }
  }

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
  const cannotByHandover = payload.cannotReconcileByHandoverId ?? {}
  const newMatchedByHandover: Record<string, ReceiptForReconciliation[]> = {}
  const newCannotByHandover: Record<string, { row: ReceiptForReconciliation; reason: string }[]> = {}
  let postedCount = 0

  for (const tab of chain) {
    const already = new Set(tab.receipts.filter(isReceiptRowProcessed).map((r) => r.id))
    const tickedIds = (payload.tickedReceiptIdsByHandoverId[tab.handover.id] ?? []).filter((id) => !already.has(id))
    const cannotItems = (cannotByHandover[tab.handover.id] ?? []).filter((item) => !already.has(item.id))
    const cannotIds = new Set(cannotItems.map((item) => item.id))
    const matched = tab.receipts.filter((r) => tickedIds.includes(r.id) && !cannotIds.has(r.id))
    const cannotRows: { row: ReceiptForReconciliation; reason: string }[] = []
    for (const item of cannotItems) {
      const row = tab.receipts.find((r) => r.id === item.id)
      if (!row) continue
      const reason = item.reason.trim()
      if (!reason) return { success: false, error: "A reason is required to mark a receipt as can't reconcile." }
      cannotRows.push({ row, reason })
    }
    newMatchedByHandover[tab.handover.id] = matched
    newCannotByHandover[tab.handover.id] = cannotRows
    postedCount += matched.length + cannotRows.length
  }

  if (postedCount === 0) {
    return { success: false, error: "Select at least one open receipt to reconcile, or mark it as can't reconcile." }
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
    const matched = newMatchedByHandover[handover.id] ?? []
    const amounts: { method: number; amount: number }[] = methodOrder
      .map((method) => ({ method, amount: netAmountByMethod(matched, method) }))
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
    const description = `Reconciliation batch: Main shift ${mainShiftId}${mainShiftStartedAt ? ` (started ${mainShiftStartedAt})` : ""}, till: ${tillUserName}. From ${fromLabel}: matched ${matched.length}. ${methodParts.join(", ")} → branch Reconciled account.`

    const journalResult = await createJournalEntry({
      date: now,
      description,
      referenceType: REFERENCE_TYPES.Reconciliation,
      referenceId: payload.handoverId,
      createdBy: reconciledByUserId,
      lines,
    })

    if (!journalResult.success) {
      return { success: false, error: journalResult.error ?? "Failed to create journal entry." }
    }
  }

  const parentIdsTouched = new Set<string>()
  for (const tab of chain) {
    for (const row of newMatchedByHandover[tab.handover.id] ?? []) {
      if (row.id === row.receiptId) {
        await prisma.receipt.update({
          where: { id: row.receiptId },
          data: {
            reconciledAt: now,
            reconciledBy: reconciledByUserId,
            reconciledHandoverId: payload.handoverId,
          },
        })
      } else {
        await prisma.receiptPaymentLine.update({
          where: { id: row.id },
          data: { reconciledAt: now, reconciledBy: reconciledByUserId },
        })
        parentIdsTouched.add(row.receiptId)
      }
    }
    for (const { row, reason } of newCannotByHandover[tab.handover.id] ?? []) {
      if (row.id === row.receiptId) {
        await prisma.receipt.update({
          where: { id: row.receiptId },
          data: {
            cannotReconcileAt: now,
            cannotReconcileBy: reconciledByUserId,
            cannotReconcileReason: reason,
            reconciledHandoverId: payload.handoverId,
          },
        })
      } else {
        await prisma.receiptPaymentLine.update({
          where: { id: row.id },
          data: {
            cannotReconcileAt: now,
            cannotReconcileBy: reconciledByUserId,
            cannotReconcileReason: reason,
          },
        })
        parentIdsTouched.add(row.receiptId)
      }
    }
  }

  for (const parentId of parentIdsTouched) {
    const parent = await prisma.receipt.findUnique({
      where: { id: parentId },
      select: {
        paymentLines: {
          select: { paymentMethod: true, reconciledAt: true, cannotReconcileAt: true },
        },
      },
    })
    if (!parent) continue
    const nonCashLines = parent.paymentLines.filter((l) => NON_CASH_METHOD_SET.has(l.paymentMethod))
    const allHandled = nonCashLines.length > 0 && nonCashLines.every((l) => l.reconciledAt || l.cannotReconcileAt)
    if (!allHandled) continue
    await prisma.receipt.update({
      where: { id: parentId },
      data: {
        reconciledAt: now,
        reconciledBy: reconciledByUserId,
        reconciledHandoverId: payload.handoverId,
      },
    })
  }

  const remainingCount = chain.reduce((sum, tab) => {
    const processedNow = new Set([
      ...(newMatchedByHandover[tab.handover.id] ?? []).map((r) => r.id),
      ...(newCannotByHandover[tab.handover.id] ?? []).map((c) => c.row.id),
    ])
    return (
      sum +
      tab.receipts.filter((r) => !isReceiptRowProcessed(r) && !processedNow.has(r.id)).length
    )
  }, 0)
  const complete = remainingCount === 0
  const hasNewIssues = Object.values(newCannotByHandover).some((rows) => rows.length > 0)

  if (complete) {
    await prisma.shiftHandover.update({
      where: { id: payload.handoverId },
      data: {
        nonCashReconciledAt: now,
        nonCashReconciledBy: reconciledByUserId,
        reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED,
        ...(hasNewIssues ? { hasReconciliationIssues: true } : {}),
      },
    })
    const includedIds = chain.map((t) => t.handover.id).filter((id) => id !== payload.handoverId)
    if (includedIds.length > 0) {
      await prisma.shiftHandover.updateMany({
        where: { id: { in: includedIds } },
        data: { reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED },
      })
    }
  } else if (hasNewIssues) {
    await prisma.shiftHandover.update({
      where: { id: payload.handoverId },
      data: { hasReconciliationIssues: true },
    })
  }

  logActivityNonBlocking({
    userId: reconciledByUserId,
    action: "shift.handover.reconciliation_submitted",
    entityType: "ShiftHandover",
    entityId: payload.handoverId,
    metadata: { receiptCount: postedCount, complete, remainingCount },
  })

  return { success: true, complete, remainingCount, postedCount }
}

async function assertUserCanBeReconciler(userId: string): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId, status: 1 },
    select: { userType: true, userGroup: { select: { permissions: true } } },
  })
  if (!user) return false
  if (user.userType === userTypes.admin) return true
  return hasPermission(
    user.userGroup?.permissions as Permissions | null,
    "reconciliation",
    "approve-reconciliation"
  )
}

/** Mark a handover as sent to reconciliation and assign a reconciler. Only recipient; only after approval. */
export async function sendHandoverToReconciliation(
  handoverId: string,
  requestedByUserId: string,
  assignedToUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!assignedToUserId?.trim()) {
    return { success: false, error: "Please select a user to reconcile." }
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    select: {
      id: true,
      toUserId: true,
      status: true,
      nonCashReconciledAt: true,
      reconciliationStatus: true,
      reconciliationAssignedToUserId: true,
      forwardedToHandoverId: true,
      includedHandoverIds: true,
    },
  })
  if (!handover) return { success: false, error: "Handover not found." }
  if (handover.toUserId !== requestedByUserId) {
    return { success: false, error: "Only the recipient can send this handover to reconciliation." }
  }
  if (handover.status !== HANDOVER_STATUS.APPROVED) return { success: false, error: "Handover is not approved." }
  if (handover.nonCashReconciledAt) return { success: false, error: "Handover is already reconciled." }
  const reconStatus = handover.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED) {
    return { success: false, error: "Handover is already reconciled." }
  }
  if (reconStatus === RECONCILIATION_STATUS.IN_RECONCILIATION && handover.reconciliationAssignedToUserId) {
    return { success: false, error: "Handover is already in reconciliation. Change the assignee instead." }
  }
  if (handover.forwardedToHandoverId) {
    return { success: false, error: "Use the top-level handover, not an included one." }
  }

  const canAssign = await assertUserCanBeReconciler(assignedToUserId)
  if (!canAssign) {
    return { success: false, error: "Selected user does not have permission to approve reconciliation." }
  }

  const now = new Date()
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: {
      reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION,
      reconciliationRequestedAt: now,
      reconciliationRequestedBy: requestedByUserId,
      reconciliationAssignedToUserId: assignedToUserId,
    },
  })

  // Reset chain handovers that were rejected back to IN_RECONCILIATION
  const includedIds = (handover.includedHandoverIds ?? []) as string[]
  if (includedIds.length > 0) {
    await prisma.shiftHandover.updateMany({
      where: { id: { in: includedIds }, reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_REJECTED },
      data: { reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION },
    })
  }

  logActivityNonBlocking({
    userId: requestedByUserId,
    action: "shift.handover.sent_to_reconciliation",
    entityType: "ShiftHandover",
    entityId: handoverId,
    metadata: { assignedToUserId },
  })

  await createNotification({
    userId: assignedToUserId,
    type: NOTIFICATION_TYPES.ReconciliationAssigned,
    title: "Handover assigned for reconciliation",
    message: "A handover was sent to you for reconciliation.",
    referenceType: NOTIF_REF_TYPES.ShiftHandover,
    referenceId: handoverId,
  })

  return { success: true }
}

/** Change reconciler while IN_RECONCILIATION and not yet reconciled. Recipient or current assignee can change. */
export async function changeReconciliationAssignee(
  handoverId: string,
  changedByUserId: string,
  newAssignedToUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!newAssignedToUserId?.trim()) {
    return { success: false, error: "Please select a user to reconcile." }
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    select: {
      id: true,
      toUserId: true,
      status: true,
      nonCashReconciledAt: true,
      reconciliationStatus: true,
      reconciliationAssignedToUserId: true,
      forwardedToHandoverId: true,
    },
  })
  if (!handover) return { success: false, error: "Handover not found." }
  if (handover.status !== HANDOVER_STATUS.APPROVED) return { success: false, error: "Handover is not approved." }
  if (handover.nonCashReconciledAt) return { success: false, error: "Handover is already reconciled." }
  const reconStatus = handover.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
  if (reconStatus === RECONCILIATION_STATUS.RECONCILED_APPROVED) {
    return { success: false, error: "Cannot change reconciler after reconciliation is complete." }
  }
  if (reconStatus !== RECONCILIATION_STATUS.IN_RECONCILIATION) {
    return { success: false, error: "Handover is not in reconciliation." }
  }
  if (handover.forwardedToHandoverId) {
    return { success: false, error: "Use the top-level handover, not an included one." }
  }

  const isRecipient = handover.toUserId === changedByUserId
  const isCurrentAssignee = handover.reconciliationAssignedToUserId === changedByUserId
  if (!isRecipient && !isCurrentAssignee) {
    return { success: false, error: "Only the handover recipient or current assignee can change the reconciler." }
  }

  if (handover.reconciliationAssignedToUserId === newAssignedToUserId) {
    return { success: false, error: "That user is already assigned." }
  }

  const canAssign = await assertUserCanBeReconciler(newAssignedToUserId)
  if (!canAssign) {
    return { success: false, error: "Selected user does not have permission to approve reconciliation." }
  }

  const previousAssigneeId = handover.reconciliationAssignedToUserId
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: { reconciliationAssignedToUserId: newAssignedToUserId },
  })

  logActivityNonBlocking({
    userId: changedByUserId,
    action: "shift.handover.reconciliation_assignee_changed",
    entityType: "ShiftHandover",
    entityId: handoverId,
    metadata: { previousAssigneeId, newAssignedToUserId },
  })

  await createNotification({
    userId: newAssignedToUserId,
    type: NOTIFICATION_TYPES.ReconciliationAssigned,
    title: "Handover assigned for reconciliation",
    message: "A handover was assigned to you for reconciliation.",
    referenceType: NOTIF_REF_TYPES.ShiftHandover,
    referenceId: handoverId,
  })

  return { success: true }
}

/** Reject reconciliation for a handover (and its chain). Only assigned reconciler. */
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
      reconciliationAssignedToUserId: true,
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
  if (reconStatus !== RECONCILIATION_STATUS.IN_RECONCILIATION) {
    return { success: false, error: "Handover has not been sent to reconciliation." }
  }
  if (top.forwardedToHandoverId) return { success: false, error: "Use the top-level handover document." }
  const actor = await prisma.user.findUnique({
    where: { id: rejectedByUserId },
    select: { userType: true },
  })
  const isAdmin = actor?.userType === 1
  if (
    !isAdmin &&
    top.reconciliationAssignedToUserId &&
    top.reconciliationAssignedToUserId !== rejectedByUserId
  ) {
    return { success: false, error: "Only the assigned reconciler can reject this reconciliation." }
  }
  const trimmedReason = (reason ?? "").trim()
  if (!trimmedReason) return { success: false, error: "Rejection reason is required." }

  const postedJournalCount = await prisma.journal.count({
    where: {
      referenceId: topLevelHandoverId,
      OR: [
        { referenceType: REFERENCE_TYPES.Reconciliation },
        {
          referenceType: REFERENCE_TYPES.ShiftHandover,
          description: { startsWith: "Reconciliation" },
        },
      ],
    },
  })
  if (postedJournalCount > 0) {
    return { success: false, error: "Cannot reject reconciliation after at least one receipt has been posted." }
  }

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

  logActivityNonBlocking({
    userId: rejectedByUserId,
    action: "shift.handover.reconciliation_rejected",
    entityType: "ShiftHandover",
    entityId: topLevelHandoverId,
    metadata: { reason: trimmedReason },
  })

  return { success: true }
}
