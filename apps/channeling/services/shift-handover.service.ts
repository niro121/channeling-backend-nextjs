"use server"

import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { SHIFT_STATUS } from "@/types/shift"
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from "@/types/handover"
import { RECEIPT_PAYMENT_METHOD, PAYMENT_METHOD_NAMES } from "@/types/receipt"
import { REFERENCE_TYPES } from "@/types/accounting"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { getIO, shiftUpdateRoom } from "@/lib/socket-server"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import { getCurrentShift } from "@/services/shift.service"
import { createJournalEntry, resolveTillForUserAndLocation } from "@/services/accounting.service"
import {
  getOpenFloatsBlockingShiftEnd,
  openFloatsBlockingMessage,
} from "@/services/float-request.service"
import { createNotification } from "@/services/notification.service"
import { NOTIFICATION_TYPES, REFERENCE_TYPES as NOTIF_REF_TYPES } from "@/types/notification"
import { z } from "zod"
import {
  expectedHandoverAvailableFromTill,
  formatHandoverOverAmountError,
  getHandoverAmountOvers,
  normalizedIncludedIds,
} from "@/lib/handover-utils"
import { parseReportDateTime } from "@/lib/parse-report-datetime"
import { allocateHandoverDocumentNumber, ensureHandoverDocumentNumber } from "@/services/shift-handover-sequence"
import { formatCents } from "@/lib/format-money"
import {
  attachShiftBillsToHandover,
  listShiftBillAttachmentsForHandover,
  unlinkShiftBillsFromHandover,
} from "@/services/shift-bill-attachment.service"

const CLOSED_HANDOVER_STATUSES = [
  HANDOVER_STATUS.APPROVED,
  HANDOVER_STATUS.REJECTED,
  HANDOVER_STATUS.CANCELLED,
] as const

export async function countPendingIncomingHandovers(userId: string): Promise<number> {
  const rows = await prisma.shiftHandover.findMany({
    where: {
      toUserId: userId,
      status: { notIn: [...CLOSED_HANDOVER_STATUSES] },
    },
    select: { status: true },
  })
  return rows.filter((h) => Number(h.status) === HANDOVER_STATUS.PENDING).length
}

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

/** Submit handover: create PENDING handover, set shift to HANDOVER_PENDING. No journal until approved. */
export async function processShiftHandover(
  shiftId: string,
  fromUserId: string,
  toUserId: string,
  amounts: ShiftHandoverAmounts,
  discrepancyReason?: string,
  enteredBreakdown?: ShiftHandoverEnteredBreakdown,
  includedHandoverIds?: string[],
  attachmentIds?: string[]
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

  const { openApprovalsBlockingShiftMessage } = await import("@/services/approval-request.service")
  const openApprovalsError = await openApprovalsBlockingShiftMessage(validFrom)
  if (openApprovalsError) {
    return { success: false, error: openApprovalsError }
  }

  const idsFromClient = Array.isArray(includedHandoverIds) ? includedHandoverIds.filter((id) => typeof id === "string" && id.trim() !== "") : []

  // Same criteria as getIncludableHandoversForSender: approved, not forwarded, not held/done in reconciliation.
  // Server decides the canonical list; client list is only validated (must match).
  const includableRaw = await prisma.shiftHandover.findMany({
    where: {
      toUserId: validFrom,
      status: HANDOVER_STATUS.APPROVED,
    },
    select: { id: true, forwardedToHandoverId: true, reconciliationStatus: true },
    orderBy: { createdAt: "asc" },
  })
  const includable = includableRaw.filter(
    (h) => h.forwardedToHandoverId == null && !isExcludedFromBulkTransfer(h.reconciliationStatus)
  )
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
  const pastMaxDuration = shift.endsAt.getTime() <= Date.now()
  const canHandoverWhilePaused = shift.status === SHIFT_STATUS.PAUSED && pastMaxDuration
  if (shift.status !== SHIFT_STATUS.ACTIVE && !canHandoverWhilePaused) {
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

  const pendingHandoversToMe = await countPendingIncomingHandovers(validFrom)
  if (pendingHandoversToMe > 0) {
    return {
      success: false,
      error: `You have ${pendingHandoversToMe} handover(s) pending your acceptance. Accept or reject them from the Handovers page before submitting a new handover.`,
    }
  }

  const openFloats = await getOpenFloatsBlockingShiftEnd(validFrom)
  const openFloatsError = await openFloatsBlockingMessage(openFloats, "handover")
  if (openFloatsError) {
    return { success: false, error: openFloatsError }
  }

  const breakdown = await getTillBalanceBreakdown(validFrom)
  if (!breakdown.tillAccountId) {
    return { success: false, error: "You do not have a till account." }
  }

  // Non-cash still on till but held in open reconciliation must stay with this bulk cashier.
  const held = await getNonCashHeldInReconciliation(validFrom)
  const available = expectedHandoverAvailableFromTill(breakdown, held)
  const overs = getHandoverAmountOvers(amt, available)
  if (overs.length > 0) {
    return {
      success: false,
      error: formatHandoverOverAmountError(overs, "submit"),
    }
  }

  const hasShort =
    amt.cashCents < available.cashCents ||
    amt.cardCents < available.cardCents ||
    amt.slipCents < available.slipCents ||
    amt.checkCents < available.checkCents ||
    amt.creditCents < available.creditCents ||
    amt.eWalletCents < available.eWalletCents
  if (hasShort && !parsed.data.discrepancyReason?.trim()) {
    return {
      success: false,
      error: "Please provide a reason for the discrepancy.",
    }
  }

  const totalCents =
    amt.cashCents + amt.cardCents + amt.slipCents + amt.checkCents + amt.creditCents + amt.eWalletCents

  const [fromUser, toUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: validFrom },
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: validTo },
      select: { id: true, name: true },
    }),
  ])
  if (!toUser) {
    return { success: false, error: "Handover recipient not found." }
  }

  const dataIncludedHandoverIds = validatedIncludeIds.length > 0 ? (validatedIncludeIds as unknown as object) : undefined
  console.log("[processShiftHandover] creating handover with includedHandoverIds:", {
    validatedIncludeIdsLength: validatedIncludeIds.length,
    dataIncludedHandoverIds,
    willSet: !!dataIncludedHandoverIds,
  })

  const documentNumber = await allocateHandoverDocumentNumber(shift.locationId ?? null)
  if (!documentNumber) {
    return { success: false, error: "Could not allocate a handover document number. Please try again." }
  }

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
      handoverNo: documentNumber.handoverNo,
      handoverNoString: documentNumber.handoverNoString,
    },
  })

  const verify = await prisma.shiftHandover.findUnique({
    where: { id: handover.id },
    select: { id: true, includedHandoverIds: true },
  })
  console.log("[processShiftHandover] after create, re-fetched handover includedHandoverIds:", verify?.includedHandoverIds, "type:", typeof verify?.includedHandoverIds)

  const attachResult = await attachShiftBillsToHandover({
    shiftId: validShiftId,
    fromUserId: validFrom,
    handoverId: handover.id,
    attachmentIds: Array.isArray(attachmentIds) ? attachmentIds : [],
  })
  if (!attachResult.success) {
    await prisma.shiftHandover.delete({ where: { id: handover.id } }).catch(() => undefined)
    return { success: false, error: attachResult.error }
  }

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

  const fromName = fromUser?.name?.trim() || "A cashier"
  const handoverLabel = handover.handoverNoString ? ` ${handover.handoverNoString}` : ""
  await createNotification({
    userId: validTo,
    type: NOTIFICATION_TYPES.HandoverSubmitted,
    title: "Handover submitted to you",
    message: `${fromName} submitted handover${handoverLabel} totaling LKR ${formatCents(totalCents)}. Approve or reject it.`,
    referenceType: NOTIF_REF_TYPES.ShiftHandover,
    referenceId: handover.id,
  })

  const io = getIO()
  if (io) {
    io.to(shiftUpdateRoom(validFrom)).emit("shift-update", {})
    io.to(shiftUpdateRoom(validTo)).emit("shift-update", {})
  }

  return { success: true, handoverId: handover.id }
}

/**
 * After a full-till handover is approved, end any other leftover open shifts for the sender
 * (expired ACTIVE/PAUSED, or stuck HANDOVER_PENDING). Pending leftover handovers are cancelled.
 * Each close is activity-logged against this approved handover.
 */
async function closeLeftoverOpenShiftsOnHandoverApproval(params: {
  fromUserId: string
  exceptShiftId: string
  handoverId: string
  approvedByUserId: string
  now: Date
}): Promise<{ endedShiftIds: string[]; cancelledHandoverIds: string[] }> {
  const leftoverShifts = (await shiftModel.findMany({
    where: {
      userId: params.fromUserId,
      id: { not: params.exceptShiftId },
      status: { in: [SHIFT_STATUS.ACTIVE, SHIFT_STATUS.PAUSED, SHIFT_STATUS.HANDOVER_PENDING] },
    },
    select: { id: true, status: true, startedAt: true, endsAt: true },
    orderBy: { startedAt: "desc" },
  })) as { id: string; status: number; startedAt: Date; endsAt: Date }[]

  if (leftoverShifts.length === 0) {
    return { endedShiftIds: [], cancelledHandoverIds: [] }
  }

  const leftoverIds = leftoverShifts.map((s) => s.id)
  const pendingHandovers = await prisma.shiftHandover.findMany({
    where: {
      shiftId: { in: leftoverIds },
      fromUserId: params.fromUserId,
      status: HANDOVER_STATUS.PENDING,
    },
    select: { id: true, shiftId: true, toUserId: true },
  })

  if (pendingHandovers.length > 0) {
    await prisma.shiftHandover.updateMany({
      where: { id: { in: pendingHandovers.map((h) => h.id) } },
      data: {
        status: HANDOVER_STATUS.CANCELLED,
        cancelledAt: params.now,
        cancelledBy: params.fromUserId,
      },
    })
  }

  await shiftModel.updateMany({
    where: { id: { in: leftoverIds } },
    data: {
      status: SHIFT_STATUS.ENDED,
      endedAt: params.now,
      endedBy: params.fromUserId,
      updatedAt: params.now,
    },
  })

  logActivityNonBlocking({
    userId: params.approvedByUserId,
    action: "shift.leftover.ended_on_handover",
    entityType: "ShiftHandover",
    entityId: params.handoverId,
    metadata: {
      fromUserId: params.fromUserId,
      handoverShiftId: params.exceptShiftId,
      endedShiftIds: leftoverIds,
      cancelledHandoverIds: pendingHandovers.map((h) => h.id),
      shifts: leftoverShifts.map((s) => ({
        id: s.id,
        previousStatus: s.status,
        startedAt: s.startedAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      })),
    },
  })

  for (const shift of leftoverShifts) {
    logActivityNonBlocking({
      userId: params.fromUserId,
      action: "shift.ended",
      entityType: "Shift",
      entityId: shift.id,
      metadata: {
        endedAt: params.now.toISOString(),
        leftoverOnHandoverApproval: true,
        handoverId: params.handoverId,
        previousStatus: shift.status,
      },
    })
  }

  for (const h of pendingHandovers) {
    logActivityNonBlocking({
      userId: params.fromUserId,
      action: "shift.handover.cancelled",
      entityType: "ShiftHandover",
      entityId: h.id,
      metadata: {
        shiftId: h.shiftId,
        toUserId: h.toUserId,
        supersededByHandoverId: params.handoverId,
        reason: "Leftover pending handover cancelled because a later full-till handover was approved.",
      },
    })
  }

  const io = getIO()
  if (io) {
    for (const toUserId of [...new Set(pendingHandovers.map((h) => h.toUserId))]) {
      io.to(shiftUpdateRoom(toUserId)).emit("shift-update", {})
    }
  }

  return {
    endedShiftIds: leftoverIds,
    cancelledHandoverIds: pendingHandovers.map((h) => h.id),
  }
}

/** Approve and receive handover (bulk cashier only): record approval with user and datetime, optional comments; create journal (funds to bulk cashier till), set handover APPROVED, end shift. Reconciliation is sent separately after approval. */
export async function approveHandover(
  handoverId: string,
  approvedByUserId: string,
  approvalComments?: string
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

  const held = await getNonCashHeldInReconciliation(handover.fromUserId)
  const available = expectedHandoverAvailableFromTill(breakdown, held)
  const overs = getHandoverAmountOvers(
    {
      cashCents: handover.cashCents,
      cardCents: handover.cardCents,
      slipCents: handover.slipCents,
      checkCents: handover.checkCents,
      creditCents: handover.creditCents,
      eWalletCents: handover.eWalletCents,
    },
    available
  )
  if (overs.length > 0) {
    return {
      success: false,
      error: formatHandoverOverAmountError(overs, "approve"),
    }
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
    const recipientTillLocationId = approverShift.locationId ?? null
    if (!recipientTillLocationId) {
      return { success: false, error: "Your current shift has no location. Start a shift at a location to receive a handover." }
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
        : RECONCILIATION_STATUS.PENDING,
      ...(autoReconciled && {
        nonCashReconciledAt: now,
        nonCashReconciledBy: approvedByUserId,
      }),
    },
  })

  await shiftModel.update({
    where: { id: handover.shiftId },
    data: { status: SHIFT_STATUS.ENDED, endedAt: now, endedBy: handover.fromUserId, updatedAt: now },
  })

  // Full till has moved with this approval — close any other leftover open shifts for the sender.
  const leftover = await closeLeftoverOpenShiftsOnHandoverApproval({
    fromUserId: handover.fromUserId,
    exceptShiftId: handover.shiftId,
    handoverId,
    approvedByUserId,
    now,
  })

  logActivityNonBlocking({
    userId: approvedByUserId,
    action: "shift.handover.approved",
    entityType: "ShiftHandover",
    entityId: handoverId,
    metadata: {
      shiftId: handover.shiftId,
      fromUserId: handover.fromUserId,
      totalCents,
      leftoverEndedShiftIds: leftover.endedShiftIds,
      leftoverCancelledHandoverIds: leftover.cancelledHandoverIds,
    },
  })

  const toName = handover.toUser?.name ?? "Bulk cashier"
  const leftoverNote =
    leftover.endedShiftIds.length > 0
      ? ` ${leftover.endedShiftIds.length} leftover open shift(s) were also ended with this approval.`
      : ""
  await createNotification({
    userId: handover.fromUserId,
    type: NOTIFICATION_TYPES.HandoverApproved,
    title: "Handover approved and received",
    message: `${toName} has approved and received your shift handover. Your shift has been ended.${leftoverNote}`,
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
  await unlinkShiftBillsFromHandover(handoverId)

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
    include: { shift: true, fromUser: { select: { name: true } } },
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
  await unlinkShiftBillsFromHandover(handoverId)

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

  const fromName = handover.fromUser?.name?.trim() || "The sender"
  await createNotification({
    userId: handover.toUserId,
    type: NOTIFICATION_TYPES.HandoverCancelled,
    title: "Handover cancelled",
    message: `${fromName} cancelled the pending handover.`,
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

/** Handovers pending for the current user (toUserId = me). */
export async function getHandoversToMe(toUserId: string) {
  const rows = await prisma.shiftHandover.findMany({
    where: {
      toUserId,
      status: { notIn: [...CLOSED_HANDOVER_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })
  return rows.filter((h) => Number(h.status) === HANDOVER_STATUS.PENDING)
}

/** Handovers approved by me that still need a reconciler assigned (PENDING, or IN_RECONCILIATION with no assignee). Top-level only. */
export async function getHandoversApprovedByMeNotReconciled(toUserId: string) {
  // Do not filter reconciliationStatus in Mongo where (null vs 0 mismatch). Filter in memory.
  const results = await prisma.shiftHandover.findMany({
    where: {
      toUserId,
      status: HANDOVER_STATUS.APPROVED,
    },
    orderBy: { createdAt: "desc" },
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })
  const filtered = results.filter((r) => {
    if (r.nonCashReconciledAt != null) return false
    if (r.forwardedToHandoverId != null) return false
    const recon = r.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
    if (recon === RECONCILIATION_STATUS.PENDING) return true
    if (recon === RECONCILIATION_STATUS.RECONCILED_REJECTED) return true
    // Legacy / auto-sent without assignee — still needs someone assigned
    if (recon === RECONCILIATION_STATUS.IN_RECONCILIATION && !r.reconciliationAssignedToUserId) return true
    return false
  })
  console.log(
    "[getHandoversApprovedByMeNotReconciled] toUserId:",
    toUserId,
    "raw:",
    results.map((r) => ({
      id: r.id,
      recon: r.reconciliationStatus,
      assigned: r.reconciliationAssignedToUserId,
      nonCashAt: r.nonCashReconciledAt,
      fwd: r.forwardedToHandoverId,
      card: r.cardCents,
      cash: r.cashCents,
    })),
    "after filter:",
    filtered.length,
    "ids:",
    filtered.map((r) => r.id)
  )
  return filtered
}

/** Single handover by id. Access (participant vs view-any) is enforced in the action. */
export async function getHandoverById(handoverId: string) {
  const handover = await prisma.shiftHandover.findFirst({
    where: { id: handoverId },
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      toUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      journal: { select: { journalNumber: true } },
      shift: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          userId: true,
          locationId: true,
          location: { select: { name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!handover) return null
  const existingNo = (handover as { handoverNoString?: string | null }).handoverNoString
  if (existingNo) return handover

  const assigned = await ensureHandoverDocumentNumber(handover.id, handover.shift?.locationId ?? null)
  if (!assigned) return handover
  return { ...handover, handoverNoString: assigned }
}

/**
 * Completed handovers received by me (approved or rejected), with DB pagination and filters.
 * Date range filters on handover `createdAt` (local calendar days when YYYY-MM-DD).
 */
export async function getCompletedHandoversToMe(
  toUserId: string,
  params: {
    page?: number
    limit?: number
    dateFrom?: string | null
    dateTo?: string | null
    fromUserId?: string | null
  } = {}
): Promise<{ data: Awaited<ReturnType<typeof fetchCompletedHandoverPage>>; totalRecords: number }> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 20))
  const skip = (page - 1) * limit

  const and: Prisma.ShiftHandoverWhereInput[] = [
    { toUserId },
    { status: { in: [HANDOVER_STATUS.APPROVED, HANDOVER_STATUS.REJECTED] } },
  ]

  if (params.fromUserId && params.fromUserId.trim() !== "" && params.fromUserId !== "__all__") {
    and.push({ fromUserId: params.fromUserId.trim() })
  }

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? parseReportDateTime(params.dateFrom.trim(), false) : null
    const to = params.dateTo ? parseReportDateTime(params.dateTo.trim(), true) : null
    const createdAt: Prisma.DateTimeFilter = {}
    if (from) createdAt.gte = from
    if (to) createdAt.lte = to
    if (from || to) and.push({ createdAt })
  }

  const where: Prisma.ShiftHandoverWhereInput = { AND: and }

  const [totalRecords, data] = await Promise.all([
    prisma.shiftHandover.count({ where }),
    fetchCompletedHandoverPage(where, skip, limit),
  ])

  return { data, totalRecords }
}

export type HandoverHistoryDirection = "all" | "given" | "received"
export type HandoverHistoryStatusFilter = "all" | "pending" | "approved" | "rejected" | "cancelled"

const HISTORY_STATUS_MAP: Record<Exclude<HandoverHistoryStatusFilter, "all">, number> = {
  pending: HANDOVER_STATUS.PENDING,
  approved: HANDOVER_STATUS.APPROVED,
  rejected: HANDOVER_STATUS.REJECTED,
  cancelled: HANDOVER_STATUS.CANCELLED,
}

/**
 * Handovers the current user gave or received (any status), with search, filters, and pagination.
 */
export async function getMyHandoverHistory(
  userId: string,
  params: {
    page?: number
    limit?: number
    dateFrom?: string | null
    dateTo?: string | null
    direction?: string | null
    status?: string | null
    otherUserId?: string | null
    search?: string | null
  } = {}
): Promise<{
  data: Array<Awaited<ReturnType<typeof fetchCompletedHandoverPage>>[number] & { direction: "given" | "received" }>
  totalRecords: number
}> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 20))
  const skip = (page - 1) * limit

  const direction: HandoverHistoryDirection =
    params.direction === "given" || params.direction === "received" ? params.direction : "all"
  const statusKey = (params.status ?? "all").trim()
  const status: HandoverHistoryStatusFilter = statusKey in HISTORY_STATUS_MAP ? (statusKey as HandoverHistoryStatusFilter) : "all"
  const otherUserId =
    params.otherUserId && params.otherUserId.trim() !== "" && params.otherUserId !== "__all__"
      ? params.otherUserId.trim()
      : null

  const and: Prisma.ShiftHandoverWhereInput[] = []

  if (direction === "given") {
    and.push({ fromUserId: userId })
    if (otherUserId) and.push({ toUserId: otherUserId })
  } else if (direction === "received") {
    and.push({ toUserId: userId })
    if (otherUserId) and.push({ fromUserId: otherUserId })
  } else if (otherUserId) {
    and.push({
      OR: [
        { fromUserId: userId, toUserId: otherUserId },
        { toUserId: userId, fromUserId: otherUserId },
      ],
    })
  } else {
    and.push({ OR: [{ fromUserId: userId }, { toUserId: userId }] })
  }

  if (status !== "all") {
    and.push({ status: HISTORY_STATUS_MAP[status] })
  }

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? parseReportDateTime(params.dateFrom.trim(), false) : null
    const to = params.dateTo ? parseReportDateTime(params.dateTo.trim(), true) : null
    const createdAt: Prisma.DateTimeFilter = {}
    if (from) createdAt.gte = from
    if (to) createdAt.lte = to
    if (from || to) and.push({ createdAt })
  }

  const q = params.search?.trim() ?? ""
  if (q) {
    const [nameUsers, staffHits] = await Promise.all([
      prisma.user.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: { id: true },
        take: 50,
      }),
      prisma.staff.findMany({
        where: { code: { contains: q, mode: "insensitive" } },
        select: { id: true },
        take: 50,
      }),
    ])
    const staffUsers =
      staffHits.length > 0
        ? await prisma.user.findMany({
            where: { staffId: { in: staffHits.map((s) => s.id) } },
            select: { id: true },
            take: 50,
          })
        : []
    const matchedUserIds = [...new Set([...nameUsers, ...staffUsers].map((u) => u.id))].filter((id) => id !== userId)
    const searchOr: Prisma.ShiftHandoverWhereInput[] = [
      { handoverNoString: { contains: q, mode: "insensitive" } },
    ]
    if (matchedUserIds.length > 0) {
      searchOr.push({ fromUserId: { in: matchedUserIds } }, { toUserId: { in: matchedUserIds } })
    }
    and.push({ OR: searchOr })
  }

  const where: Prisma.ShiftHandoverWhereInput = { AND: and }

  const [totalRecords, rows] = await Promise.all([
    prisma.shiftHandover.count({ where }),
    fetchCompletedHandoverPage(where, skip, limit),
  ])

  return {
    data: rows.map((h) => ({
      ...h,
      direction: h.fromUserId === userId ? ("given" as const) : ("received" as const),
    })),
    totalRecords,
  }
}

async function fetchCompletedHandoverPage(
  where: Prisma.ShiftHandoverWhereInput,
  skip: number,
  take: number
) {
  return prisma.shiftHandover.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      toUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })
}

/**
 * Handovers excluded from Bulk→Bulk transfer / end-shift prefill:
 * - IN_RECONCILIATION: stay with this bulk until recon completes
 * - RECONCILED_APPROVED: non-cash already cleared; do not pass again
 */
function isExcludedFromBulkTransfer(reconciliationStatus: number | null | undefined): boolean {
  const status = Number(reconciliationStatus ?? RECONCILIATION_STATUS.PENDING)
  return (
    status === RECONCILIATION_STATUS.IN_RECONCILIATION ||
    status === RECONCILIATION_STATUS.RECONCILED_APPROVED
  )
}

/** Non-cash cents still on till but held by open reconciliation (must not be handed to next bulk). */
export type NonCashHeldInReconciliation = {
  cardCents: number
  slipCents: number
  checkCents: number
  eWalletCents: number
  handoverCount: number
}

export async function getNonCashHeldInReconciliation(
  ownerUserId: string
): Promise<NonCashHeldInReconciliation> {
  const list = await prisma.shiftHandover.findMany({
    where: {
      toUserId: ownerUserId,
      status: HANDOVER_STATUS.APPROVED,
      reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION,
    },
    select: {
      cardCents: true,
      slipCents: true,
      checkCents: true,
      eWalletCents: true,
      forwardedToHandoverId: true,
    },
  })
  const held = list.filter((h) => h.forwardedToHandoverId == null)
  return {
    cardCents: held.reduce((s, h) => s + (h.cardCents ?? 0), 0),
    slipCents: held.reduce((s, h) => s + (h.slipCents ?? 0), 0),
    checkCents: held.reduce((s, h) => s + (h.checkCents ?? 0), 0),
    eWalletCents: held.reduce((s, h) => s + (h.eWalletCents ?? 0), 0),
    handoverCount: held.length,
  }
}

/** Handovers that were received into this shift (toShiftId = shiftId, approved). Used to prepopulate non-cash entries when submitting a new handover. Skips handovers in/done with reconciliation. */
export async function getHandoversReceivedByShift(shiftId: string): Promise<
  { id: string; enteredBreakdown: ShiftHandoverEnteredBreakdown | null }[]
> {
  const list = await prisma.shiftHandover.findMany({
    where: {
      toShiftId: shiftId,
      status: {
        notIn: [HANDOVER_STATUS.PENDING, HANDOVER_STATUS.REJECTED, HANDOVER_STATUS.CANCELLED],
      },
    },
    select: { id: true, status: true, enteredBreakdown: true, reconciliationStatus: true },
    orderBy: { createdAt: "asc" },
  })
  return list
    .filter(
      (h) => Number(h.status) === HANDOVER_STATUS.APPROVED && !isExcludedFromBulkTransfer(h.reconciliationStatus)
    )
    .map((h) => ({
      id: h.id,
      enteredBreakdown: h.enteredBreakdown as ShiftHandoverEnteredBreakdown | null,
    }))
}

function handoverFromLabel(
  fromUser: { name: string | null; staff?: { code: string } | null } | null | undefined
): string {
  if (!fromUser) return "—"
  const name = fromUser.name ?? "—"
  return fromUser.staff?.code ? `${name} (${fromUser.staff.code})` : name
}

export type ShiftLinkedHandover = {
  id: string
  fromLabel: string
  receivedAt: Date
  totalCents: number
  includedFrom: { id: string; fromLabel: string; totalCents: number }[]
}

/** Approved handovers received into this shift, plus any linked (included) handovers in the chain. */
export async function getLinkedHandoversForShift(shiftId: string): Promise<ShiftLinkedHandover[]> {
  const list = await prisma.shiftHandover.findMany({
    where: {
      toShiftId: shiftId,
      status: {
        notIn: [HANDOVER_STATUS.PENDING, HANDOVER_STATUS.REJECTED, HANDOVER_STATUS.CANCELLED],
      },
    },
    select: {
      id: true,
      status: true,
      approvedAt: true,
      createdAt: true,
      totalCents: true,
      includedHandoverIds: true,
      fromUser: { select: { name: true, staff: { select: { code: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  const result: ShiftLinkedHandover[] = []
  for (const h of list.filter((row) => Number(row.status) === HANDOVER_STATUS.APPROVED)) {
    const chain = await getIncludedHandoversChain(h.includedHandoverIds)
    result.push({
      id: h.id,
      fromLabel: handoverFromLabel(h.fromUser),
      receivedAt: h.approvedAt ?? h.createdAt,
      totalCents: h.totalCents,
      includedFrom: chain.map((c) => ({
        id: c.id,
        fromLabel: handoverFromLabel(c.fromUser),
        totalCents: c.totalCents,
      })),
    })
  }
  return result
}

/** Handovers the sender has received and not yet forwarded, excluding those held in/completed reconciliation. Included when submitting a new handover (passing the chain on). */
export async function getIncludableHandoversForSender(senderUserId: string): Promise<
  { id: string; createdAt: Date; totalCents: number; fromUser: { name: string | null; staff: { code: string } | null } }[]
> {
  const list = await prisma.shiftHandover.findMany({
    where: {
      toUserId: senderUserId,
      status: {
        notIn: [HANDOVER_STATUS.PENDING, HANDOVER_STATUS.REJECTED, HANDOVER_STATUS.CANCELLED],
      },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      totalCents: true,
      forwardedToHandoverId: true,
      reconciliationStatus: true,
      fromUser: { select: { name: true, staff: { select: { code: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })
  const transferable = list.filter(
    (h) =>
      Number(h.status) === HANDOVER_STATUS.APPROVED &&
      h.forwardedToHandoverId == null &&
      !isExcludedFromBulkTransfer(h.reconciliationStatus)
  )
  return transferable.map(({ forwardedToHandoverId: _f, reconciliationStatus: _r, status: _s, ...rest }) => rest)
}

const includedHandoverSelect = {
  id: true,
  fromUserId: true,
  fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
  shiftId: true,
  shift: { select: { id: true, startedAt: true, userId: true, locationId: true, user: { select: { id: true, name: true } } } },
  cashCents: true,
  cardCents: true,
  slipCents: true,
  checkCents: true,
  creditCents: true,
  eWalletCents: true,
  totalCents: true,
  createdAt: true,
  handoverNoString: true,
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

/**
 * Previous handovers associated with this handover only:
 * included on submit, forwarded to this record, or received into the same shift.
 */
export async function getPreviousHandoversForHandoverDetail(params: {
  handoverId: string
  shiftId: string
  includedHandoverIds: unknown
}): Promise<IncludedHandoverForDisplay[]> {
  const [byIds, byForwarded, receivedOnShift] = await Promise.all([
    getIncludedHandoversChain(params.includedHandoverIds),
    getHandoversByForwardedTo(params.handoverId),
    prisma.shiftHandover.findMany({
      where: {
        toShiftId: params.shiftId,
        status: {
          notIn: [HANDOVER_STATUS.PENDING, HANDOVER_STATUS.REJECTED, HANDOVER_STATUS.CANCELLED],
        },
      },
      select: { ...includedHandoverSelect, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const byId = new Map<string, IncludedHandoverForDisplay>()
  for (const h of byIds) byId.set(h.id, h)
  for (const h of byForwarded) byId.set(h.id, h)
  for (const h of receivedOnShift) {
    if (h.id === params.handoverId) continue
    if (Number(h.status) !== HANDOVER_STATUS.APPROVED) continue
    const { status: _s, ...rest } = h
    if (!byId.has(rest.id)) byId.set(rest.id, rest)
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
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
