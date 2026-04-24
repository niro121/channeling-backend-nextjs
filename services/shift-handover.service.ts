"use server"

import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { SHIFT_STATUS } from "@/types/shift"
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from "@/types/handover"
import { FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { RECEIPT_PAYMENT_METHOD, PAYMENT_METHOD_NAMES } from "@/types/receipt"
import { REFERENCE_TYPES } from "@/types/accounting"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { getIO, shiftUpdateRoom } from "@/lib/socket-server"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import { getCurrentShift } from "@/services/shift.service"
import { createJournalEntry, resolveTillForUserAndLocation } from "@/services/accounting.service"
import { createNotification } from "@/services/notification.service"
import { NOTIFICATION_TYPES, REFERENCE_TYPES as NOTIF_REF_TYPES } from "@/types/notification"
import { z } from "zod"
import { normalizedIncludedIds } from "@/lib/handover-utils"

export type ShiftHandoverAmounts = {
  cashCents: number
  cardCents: number
  slipCents: number
  checkCents: number
  creditCents: number
  eWalletCents: number
}

/** Cashier-entered breakdown for bulk cashier verification (stored in ShiftHandover.enteredBreakdown). */
export type ShiftHandoverEnteredBreakdown = {
  cashDenominations?: { value: number; count: number }[]
  cardEntries?: { reference: string; amountCents: number }[]
  slipEntries?: { reference: string; amountCents: number }[]
  checkEntries?: { reference: string; amountCents: number }[]
  creditEntries?: { reference: string; amountCents: number }[]
  eWalletEntries?: { reference: string; amountCents: number }[]
}

const handoverAmountsSchema = z.object({
  cashCents: z.number().int().min(0, "Cash amount must be 0 or more"),
  cardCents: z.number().int().min(0, "Card amount must be 0 or more"),
  slipCents: z.number().int().min(0, "Slip amount must be 0 or more"),
  checkCents: z.number().int().min(0, "Cheque amount must be 0 or more"),
  creditCents: z.number().int().min(0, "Credit amount must be 0 or more"),
  eWalletCents: z.number().int().min(0, "E-Wallet amount must be 0 or more"),
})

const processHandoverSchema = z
  .object({
    shiftId: z.string().min(1, "Shift is required"),
    fromUserId: z.string().min(1, "Sender is required"),
    toUserId: z.string().min(1, "Please select a handover recipient"),
    amounts: handoverAmountsSchema,
    discrepancyReason: z.string().optional(),
  })
  .refine((data) => data.fromUserId !== data.toUserId, {
    message: "Handover must be to a different user.",
    path: ["toUserId"],
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shiftModel = (prisma as any).shift

const OVER_TOLERANCE_CENTS = 100 // Ask for reason when over > 100 cents (1 LKR)

/** Submit handover: create PENDING handover, set shift to HANDOVER_PENDING. No journal until approved. */
export async function processShiftHandover(
  shiftId: string,
  fromUserId: string,
  toUserId: string,
  amounts: ShiftHandoverAmounts,
  discrepancyReason?: string,
  enteredBreakdown?: ShiftHandoverEnteredBreakdown,
  includedHandoverIds?: string[]
): Promise<
  | { success: true; handoverId: string }
  | { success: false; error: string }
> {
  const parsed = processHandoverSchema.safeParse({
    shiftId,
    fromUserId,
    toUserId,
    amounts,
    discrepancyReason,
  })
  if (!parsed.success) {
    const issues = parsed.error?.issues ?? []
    const first = issues[0]
    const message = first ? `${(first.path ?? []).join(".")}: ${first.message}` : parsed.error?.message ?? "Validation failed."
    return { success: false, error: message }
  }

  const { shiftId: validShiftId, fromUserId: validFrom, toUserId: validTo, amounts: amt } = parsed.data

  // Debug: what did we receive for included handovers?
  console.log("[processShiftHandover] includedHandoverIds from client:", {
    raw: includedHandoverIds,
    type: typeof includedHandoverIds,
    isArray: Array.isArray(includedHandoverIds),
    length: Array.isArray(includedHandoverIds) ? includedHandoverIds.length : 0,
  })

  if (validFrom === validTo) {
    return { success: false, error: "Handover cannot be to yourself. Please select another recipient." }
  }

  const idsFromClient = Array.isArray(includedHandoverIds) ? includedHandoverIds.filter((id) => typeof id === "string" && id.trim() !== "") : []

  // Same criteria as getIncludableHandoversForSender: handovers sent TO sender, approved, not yet forwarded.
  // Server decides the canonical list; client list is only validated (must match).
  const includableRaw = await prisma.shiftHandover.findMany({
    where: {
      toUserId: validFrom,
      status: HANDOVER_STATUS.APPROVED,
    },
    select: { id: true, forwardedToHandoverId: true },
    orderBy: { createdAt: "asc" },
  })
  const includable = includableRaw.filter((h) => h.forwardedToHandoverId == null)
  const includableIds = new Set(includable.map((h) => h.id))
  const includableIdList = includable.map((h) => h.id)

  let validatedIncludeIds: string[] = []
  if (includable.length > 0) {
    // There are handovers that must be attached; client must send the correct set
    const clientSentValid = idsFromClient.filter((id) => includableIds.has(id))
    const missing = includableIdList.filter((id) => !idsFromClient.includes(id))
    const invalid = idsFromClient.filter((id) => !includableIds.has(id))
    if (missing.length > 0) {
      return {
        success: false,
        error: "You have handover(s) you received that must be included when handing over. Please include all of them and try again.",
      }
    }
    if (invalid.length > 0) {
      return {
        success: false,
        error: "One or more included handover ids are invalid or already forwarded. Please include only the handovers shown in the list.",
      }
    }
    validatedIncludeIds = includableIdList
    console.log("[processShiftHandover] validation: includable required, client sent:", idsFromClient, "validated:", validatedIncludeIds)
  } else {
    // No includable handovers; nothing to attach
    validatedIncludeIds = []
    console.log("[processShiftHandover] no includable handovers, validatedIncludeIds: []")
  }

  const shift = await shiftModel.findFirst({
    where: {
      id: validShiftId,
      userId: validFrom,
    },
  })
  if (!shift) {
    return { success: false, error: "Shift not found or you are not the shift owner." }
  }
  if (shift.status !== SHIFT_STATUS.ACTIVE) {
    return {
      success: false,
      error:
        shift.status === SHIFT_STATUS.PAUSED
          ? "Shift must be active to submit handover. Resume the shift first."
          : shift.status === SHIFT_STATUS.HANDOVER_PENDING
            ? "This shift already has a handover pending."
            : "Shift is not active. Only an active shift can be handed over.",
    }
  }

  const existingPending = await prisma.shiftHandover.findFirst({
    where: { shiftId: validShiftId, status: HANDOVER_STATUS.PENDING },
  })
  if (existingPending) {
    return { success: false, error: "This shift already has a pending handover. Cancel it or wait for the recipient to approve or reject." }
  }

  const pendingHandoversToMe = await prisma.shiftHandover.count({
    where: { toUserId: validFrom, status: HANDOVER_STATUS.PENDING },
  })
  if (pendingHandoversToMe > 0) {
    return {
      success: false,
      error: "You have handover(s) pending your acceptance. Accept or reject them from the Handovers page before submitting a new handover.",
    }
  }

  const pendingFloat = await prisma.floatRequest.findFirst({
    where: { requestedById: validFrom, status: FLOAT_REQUEST_STATUS.PENDING },
    select: { id: true },
  })
  if (pendingFloat) {
    return {
      success: false,
      error:
        "You have a pending float request waiting for approval. Cancel it or wait for approval before handing over the shift.",
    }
  }

  const breakdown = await getTillBalanceBreakdown(validFrom)
  if (!breakdown.tillAccountId) {
    return { success: false, error: "You do not have a till account." }
  }

  const hasShort =
    amt.cashCents < breakdown.cashCents ||
    amt.cardCents < breakdown.cardCents ||
    amt.slipCents < breakdown.slipCents ||
    amt.checkCents < breakdown.checkCents ||
    amt.creditCents < breakdown.creditCents ||
    amt.eWalletCents < breakdown.eWalletCents
  const hasOverOver100 =
    (amt.cashCents - breakdown.cashCents > OVER_TOLERANCE_CENTS) ||
    (amt.cardCents - breakdown.cardCents > OVER_TOLERANCE_CENTS) ||
    (amt.slipCents - breakdown.slipCents > OVER_TOLERANCE_CENTS) ||
    (amt.checkCents - breakdown.checkCents > OVER_TOLERANCE_CENTS) ||
    (amt.creditCents - breakdown.creditCents > OVER_TOLERANCE_CENTS) ||
    (amt.eWalletCents - breakdown.eWalletCents > OVER_TOLERANCE_CENTS)
  const needsReason = hasShort || hasOverOver100
  if (needsReason && !parsed.data.discrepancyReason?.trim()) {
    return {
      success: false,
      error: "Please provide a reason for the discrepancy.",
    }
  }

  const totalCents =
    amt.cashCents + amt.cardCents + amt.slipCents + amt.checkCents + amt.creditCents + amt.eWalletCents

  const toUser = await prisma.user.findUnique({
    where: { id: validTo },
    select: { id: true, name: true },
  })
  if (!toUser) {
    return { success: false, error: "Handover recipient not found." }
  }

  const dataIncludedHandoverIds = validatedIncludeIds.length > 0 ? (validatedIncludeIds as unknown as object) : undefined
  console.log("[processShiftHandover] creating handover with includedHandoverIds:", {
    validatedIncludeIdsLength: validatedIncludeIds.length,
    dataIncludedHandoverIds,
    willSet: !!dataIncludedHandoverIds,
  })

  // 1) Save previous handover ids on the NEW handover (includedHandoverIds)
  const handover = await prisma.shiftHandover.create({
    data: {
      shiftId: validShiftId,
      fromUserId: validFrom,
      toUserId: validTo,
      status: HANDOVER_STATUS.PENDING,
      cashCents: amt.cashCents,
      cardCents: amt.cardCents,
      slipCents: amt.slipCents,
      checkCents: amt.checkCents,
      creditCents: amt.creditCents,
      eWalletCents: amt.eWalletCents,
      totalCents,
      discrepancyReason: parsed.data.discrepancyReason?.trim() || null,
      enteredBreakdown: enteredBreakdown != null ? (enteredBreakdown as object) : undefined,
      includedHandoverIds: dataIncludedHandoverIds,
    },
  })

  const verify = await prisma.shiftHandover.findUnique({
    where: { id: handover.id },
    select: { id: true, includedHandoverIds: true },
  })
  console.log("[processShiftHandover] after create, re-fetched handover includedHandoverIds:", verify?.includedHandoverIds, "type:", typeof verify?.includedHandoverIds)

  // 2) Set forwardedToHandoverId on each PREVIOUS (included) handover so we know where it was forwarded
  for (const includedId of validatedIncludeIds) {
    await prisma.shiftHandover.update({
      where: { id: includedId },
      data: { forwardedToHandoverId: handover.id },
    })
  }

  const now = new Date()
  await shiftModel.update({
    where: { id: validShiftId },
    data: { status: SHIFT_STATUS.HANDOVER_PENDING, updatedAt: now },
  })

  logActivityNonBlocking({
    userId: validFrom,
    action: "shift.handover.submitted",
    entityType: "ShiftHandover",
    entityId: handover.id,
    metadata: {
      shiftId: validShiftId,
      toUserId: validTo,
      totalCents,
    },
  })

  const io = getIO()
  if (io) {
    io.to(shiftUpdateRoom(validFrom)).emit("shift-update", {})
    io.to(shiftUpdateRoom(validTo)).emit("shift-update", {})
  }

  return { success: true, handoverId: handover.id }
}

/** Approve and receive handover (bulk cashier only): record approval with user and datetime, optional comments; create journal (funds to bulk cashier till), set handover APPROVED, end shift. If sendToReconciliation is true (and handover has non-cash), sets reconciliationStatus to IN_RECONCILIATION and reconciliationRequestedBy/At so it appears in Reconciliation for the bulk cashier. */
export async function approveHandover(
  handoverId: string,
  approvedByUserId: string,
  approvalComments?: string,
  sendToReconciliation?: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    include: { shift: true, fromUser: { select: { id: true, name: true } }, toUser: { select: { id: true, name: true } } },
  })
  if (!handover) {
    return { success: false, error: "Handover not found." }
  }
  if (handover.toUserId !== approvedByUserId) {
    return { success: false, error: "Only the recipient can approve this handover." }
  }
  if (handover.status !== HANDOVER_STATUS.PENDING) {
    return { success: false, error: "This handover is no longer pending." }
  }

  const approverShift = await getCurrentShift(approvedByUserId)
  if (!approverShift) {
    return {
      success: false,
      error: "You must have an active shift to approve and receive a handover. Start a shift from the top bar first.",
    }
  }

  const breakdown = await getTillBalanceBreakdown(handover.fromUserId)
  if (!breakdown.tillAccountId) {
    return { success: false, error: "Sender till account not found." }
  }

  const totalCents =
    handover.cashCents +
    handover.cardCents +
    handover.slipCents +
    handover.checkCents +
    handover.creditCents +
    handover.eWalletCents

  let journalId: string | null = null
  if (totalCents > 0) {
    const recipientTillLocationId = handover.shift.locationId ?? approverShift.locationId ?? null
    if (!recipientTillLocationId) {
      return { success: false, error: "Cannot resolve branch location for recipient till." }
    }
    const toTill = await resolveTillForUserAndLocation(handover.toUserId, recipientTillLocationId)
    const toAccountId = toTill.accountId

    const methodAmounts: { method: number; amount: number }[] = [
      { method: RECEIPT_PAYMENT_METHOD.CASH, amount: handover.cashCents },
      { method: RECEIPT_PAYMENT_METHOD.CREDIT_CARD, amount: handover.cardCents },
      { method: RECEIPT_PAYMENT_METHOD.SLIP, amount: handover.slipCents },
      { method: RECEIPT_PAYMENT_METHOD.CHECK, amount: handover.checkCents },
      { method: RECEIPT_PAYMENT_METHOD.CREDIT, amount: handover.creditCents },
      { method: RECEIPT_PAYMENT_METHOD.E_WALLET, amount: handover.eWalletCents },
    ].filter((m) => m.amount > 0)

    const lines: Array<{
      accountId: string
      debitAmount: number
      creditAmount: number
      paymentMethod: number
    }> = []
    for (const { method, amount } of methodAmounts) {
      lines.push({
        accountId: breakdown.tillAccountId,
        debitAmount: 0,
        creditAmount: amount,
        paymentMethod: method,
      })
      lines.push({
        accountId: toAccountId,
        debitAmount: amount,
        creditAmount: 0,
        paymentMethod: method,
      })
    }

    const fromName = handover.fromUser?.name ?? "Cashier"
    const toName = handover.toUser?.name ?? "Bulk cashier"
    const methodParts = methodAmounts.map(
      (m) => `${PAYMENT_METHOD_NAMES[m.method] ?? "Method " + m.method}: LKR ${(m.amount / 100).toFixed(2)}`
    )
    const totalLKR = (totalCents / 100).toFixed(2)
    const now = new Date()
    const approvedAtStr = now.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    let description = `Shift handover received — Journal entry: Cashier "${fromName}" handed over to "${toName}". Amounts by method: ${methodParts.join("; ")}. Total LKR ${totalLKR}. Approved and received by ${toName} on ${approvedAtStr}.`
    if (approvalComments?.trim()) {
      description += ` Comments: ${approvalComments.trim()}`
    }
    const journalResult = await createJournalEntry({
      date: now,
      description,
      referenceType: REFERENCE_TYPES.ShiftHandover,
      referenceId: handoverId,
      createdBy: handover.fromUserId,
      lines,
    })

    if (!journalResult.success) {
      const msg = journalResult.error ?? "Failed to create handover journal."
      return { success: false, error: msg.startsWith("Approval") ? msg : `Approval failed: ${msg}` }
    }
    journalId = journalResult.journalId
  }

  const now = new Date()
  const nonCashTotal =
    (handover.cardCents ?? 0) + (handover.slipCents ?? 0) + (handover.checkCents ?? 0) + (handover.eWalletCents ?? 0)
  const autoReconciled = nonCashTotal === 0
  const goToReconciliation = Boolean(sendToReconciliation && !autoReconciled)
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: {
      status: HANDOVER_STATUS.APPROVED,
      journalId,
      approvedAt: now,
      approvedBy: approvedByUserId,
      approvalComments: approvalComments?.trim() || null,
      toShiftId: approverShift.id,
      reconciliationStatus: autoReconciled
        ? RECONCILIATION_STATUS.RECONCILED_APPROVED
        : goToReconciliation
          ? RECONCILIATION_STATUS.IN_RECONCILIATION
          : RECONCILIATION_STATUS.PENDING,
      ...(autoReconciled && {
        nonCashReconciledAt: now,
        nonCashReconciledBy: approvedByUserId,
      }),
      ...(goToReconciliation && {
        reconciliationRequestedBy: approvedByUserId,
        reconciliationRequestedAt: now,
      }),
    },
  })

  await shiftModel.update({
    where: { id: handover.shiftId },
    data: { status: SHIFT_STATUS.ENDED, endedAt: now, endedBy: handover.fromUserId, updatedAt: now },
  })

  logActivityNonBlocking({
    userId: approvedByUserId,
    action: "shift.handover.approved",
    entityType: "ShiftHandover",
    entityId: handoverId,
    metadata: { shiftId: handover.shiftId, fromUserId: handover.fromUserId, totalCents },
  })

  const toName = handover.toUser?.name ?? "Bulk cashier"
  await createNotification({
    userId: handover.fromUserId,
    type: NOTIFICATION_TYPES.HandoverApproved,
    title: "Handover approved and received",
    message: `${toName} has approved and received your shift handover. Your shift has been ended.`,
    referenceType: NOTIF_REF_TYPES.ShiftHandover,
    referenceId: handoverId,
  })

  const io = getIO()
  if (io) {
    io.to(shiftUpdateRoom(handover.fromUserId)).emit("shift-update", {})
    io.to(shiftUpdateRoom(handover.toUserId)).emit("shift-update", {})
  }

  return { success: true }
}

/** Reject handover (to user only). Requires rejectReason. Shift returns to ACTIVE. */
export async function rejectHandover(
  handoverId: string,
  rejectedByUserId: string,
  rejectReason: string
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmed = rejectReason?.trim()
  if (!trimmed) {
    return { success: false, error: "Reject reason is required." }
  }

  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    include: { shift: true },
  })
  if (!handover) {
    return { success: false, error: "Handover not found." }
  }
  if (handover.toUserId !== rejectedByUserId) {
    return { success: false, error: "Only the recipient can reject this handover." }
  }
  if (handover.status !== HANDOVER_STATUS.PENDING) {
    return { success: false, error: "This handover is no longer pending." }
  }

  const now = new Date()
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: {
      status: HANDOVER_STATUS.REJECTED,
      rejectedAt: now,
      rejectedBy: rejectedByUserId,
      rejectReason: trimmed,
    },
  })

  await shiftModel.update({
    where: { id: handover.shiftId },
    data: { status: SHIFT_STATUS.ACTIVE, updatedAt: now },
  })

  logActivityNonBlocking({
    userId: rejectedByUserId,
    action: "shift.handover.rejected",
    entityType: "ShiftHandover",
    entityId: handoverId,
    metadata: { shiftId: handover.shiftId, fromUserId: handover.fromUserId },
  })

  await createNotification({
    userId: handover.fromUserId,
    type: NOTIFICATION_TYPES.HandoverRejected,
    title: "Handover rejected",
    message: trimmed ? `Reason: ${trimmed}` : undefined,
    referenceType: NOTIF_REF_TYPES.ShiftHandover,
    referenceId: handoverId,
  })

  const io = getIO()
  if (io) {
    io.to(shiftUpdateRoom(handover.fromUserId)).emit("shift-update", {})
    io.to(shiftUpdateRoom(handover.toUserId)).emit("shift-update", {})
  }

  return { success: true }
}

/** Cancel handover (from user only). Shift returns to ACTIVE. */
export async function cancelHandover(
  handoverId: string,
  cancelledByUserId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const handover = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    include: { shift: true },
  })
  if (!handover) {
    return { success: false, error: "Handover not found." }
  }
  if (handover.fromUserId !== cancelledByUserId) {
    return { success: false, error: "Only the sender can cancel this handover." }
  }
  if (handover.status !== HANDOVER_STATUS.PENDING) {
    return { success: false, error: "This handover is no longer pending." }
  }

  const now = new Date()
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: {
      status: HANDOVER_STATUS.CANCELLED,
      cancelledAt: now,
      cancelledBy: cancelledByUserId,
    },
  })

  await shiftModel.update({
    where: { id: handover.shiftId },
    data: { status: SHIFT_STATUS.ACTIVE, updatedAt: now },
  })

  logActivityNonBlocking({
    userId: cancelledByUserId,
    action: "shift.handover.cancelled",
    entityType: "ShiftHandover",
    entityId: handoverId,
    metadata: { shiftId: handover.shiftId, toUserId: handover.toUserId },
  })

  const io = getIO()
  if (io) {
    io.to(shiftUpdateRoom(handover.fromUserId)).emit("shift-update", {})
    io.to(shiftUpdateRoom(handover.toUserId)).emit("shift-update", {})
  }

  return { success: true }
}

/** Handovers pending for the current user (toUserId = me). */
export async function getHandoversToMe(toUserId: string) {
  return prisma.shiftHandover.findMany({
    where: { toUserId, status: HANDOVER_STATUS.PENDING },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })
}

/** Handovers approved by me (toUserId = me) that are not yet sent to reconciliation: status APPROVED, reconciliationStatus PENDING, top-level. For bulk cashiers to send to reconciliation manually. */
export async function getHandoversApprovedByMeNotReconciled(toUserId: string) {
  // Query only status + reconciliationStatus; filter null/missing in code so MongoDB optional fields match
  const results = await prisma.shiftHandover.findMany({
    where: {
      toUserId,
      status: HANDOVER_STATUS.APPROVED,
      reconciliationStatus: RECONCILIATION_STATUS.PENDING,
    },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })
  const filtered = results.filter(
    (r) => r.nonCashReconciledAt == null && r.forwardedToHandoverId == null
  )
  console.log("[getHandoversApprovedByMeNotReconciled] toUserId:", toUserId, "raw count:", results.length, "after filter:", filtered.length, "ids:", filtered.map((r) => r.id))
  return filtered
}

/** Single handover detail for the recipient (toUserId). Returns PENDING handovers or APPROVED handovers not yet reconciled (so bulk cashier can open and "Send to reconciliation"). */
export async function getHandoverByIdForRecipient(handoverId: string, toUserId: string) {
  const handover = await prisma.shiftHandover.findFirst({
    where: { id: handoverId, toUserId },
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })
  if (!handover) return null
  // Allow PENDING; for APPROVED only allow if not yet reconciled and top-level (check in code so MongoDB null/missing fields match)
  if (handover.status === HANDOVER_STATUS.PENDING) return handover
  if (
    handover.status === HANDOVER_STATUS.APPROVED &&
    handover.nonCashReconciledAt == null &&
    handover.forwardedToHandoverId == null
  )
    return handover
  return null
}

/** Handovers that were received into this shift (toShiftId = shiftId, approved). Used to prepopulate non-cash entries when submitting a new handover. */
export async function getHandoversReceivedByShift(shiftId: string): Promise<
  { id: string; enteredBreakdown: ShiftHandoverEnteredBreakdown | null }[]
> {
  const list = await prisma.shiftHandover.findMany({
    where: { toShiftId: shiftId, status: HANDOVER_STATUS.APPROVED },
    select: { id: true, enteredBreakdown: true },
    orderBy: { createdAt: "asc" },
  })
  return list.map((h) => ({
    id: h.id,
    enteredBreakdown: h.enteredBreakdown as ShiftHandoverEnteredBreakdown | null,
  }))
}

/** Handovers that the given user (sender) has received and not yet forwarded. Can be included when submitting a new handover (passing the chain on). */
export async function getIncludableHandoversForSender(senderUserId: string): Promise<
  { id: string; createdAt: Date; totalCents: number; fromUser: { name: string | null; staff: { code: string } | null } }[]
> {
  const list = await prisma.shiftHandover.findMany({
    where: {
      toUserId: senderUserId,
      status: HANDOVER_STATUS.APPROVED,
    },
    select: {
      id: true,
      createdAt: true,
      totalCents: true,
      forwardedToHandoverId: true,
      fromUser: { select: { name: true, staff: { select: { code: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  const notForwarded = list.filter((h) => h.forwardedToHandoverId == null)
  return notForwarded.map(({ forwardedToHandoverId: _f, ...rest }) => rest)
}

const includedHandoverSelect = {
  id: true,
  fromUserId: true,
  fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
  shiftId: true,
  shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
  cashCents: true,
  cardCents: true,
  slipCents: true,
  checkCents: true,
  creditCents: true,
  eWalletCents: true,
  totalCents: true,
  createdAt: true,
  includedHandoverIds: true,
  enteredBreakdown: true,
} as const

export type IncludedHandoverForDisplay = Prisma.ShiftHandoverGetPayload<{
  select: typeof includedHandoverSelect
}>

/** Recursively load all handovers in the included chain (direct includes + their includes). Returns flat list for display. */
export async function getIncludedHandoversChain(
  includedHandoverIds: string[] | null | unknown
): Promise<IncludedHandoverForDisplay[]> {
  const ids = normalizedIncludedIds(includedHandoverIds)
  if (ids.length === 0) return []

  const result: IncludedHandoverForDisplay[] = []
  const seen = new Set<string>()

  async function addRecursive(idsToFetch: string[]) {
    const nextIds = idsToFetch.filter((id) => !seen.has(id))
    if (nextIds.length === 0) return
    const handovers = await prisma.shiftHandover.findMany({
      where: { id: { in: nextIds } },
      select: includedHandoverSelect,
    })
    const childIds: string[] = []
    for (const h of handovers) {
      if (seen.has(h.id)) continue
      seen.add(h.id)
      result.push(h)
      const nested = normalizedIncludedIds(h.includedHandoverIds)
      childIds.push(...nested)
    }
    if (childIds.length > 0) await addRecursive(childIds)
  }

  await addRecursive(ids)
  return result
}

/** Handovers that were included in (forwarded to) the given top-level handover. Use when includedHandoverIds is empty/unreliable (e.g. JSON not read back). */
export async function getHandoversByForwardedTo(topLevelHandoverId: string) {
  return prisma.shiftHandover.findMany({
    where: { forwardedToHandoverId: topLevelHandoverId },
    orderBy: { createdAt: "asc" },
    select: includedHandoverSelect,
  })
}

/** Recursively load full chain of handovers that were forwarded into the given top-level id (order: oldest first). */
export async function getFullChainByForwardedTo(topLevelHandoverId: string): Promise<IncludedHandoverForDisplay[]> {
  const direct = await getHandoversByForwardedTo(topLevelHandoverId)
  const result: IncludedHandoverForDisplay[] = []
  for (const h of direct) {
    const nested = await getFullChainByForwardedTo(h.id)
    result.push(...nested)
    result.push(h)
  }
  return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}
