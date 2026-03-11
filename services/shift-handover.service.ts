"use server"

import prisma from "@/lib/prisma"
import { SHIFT_STATUS } from "@/types/shift"
import { HANDOVER_STATUS } from "@/types/handover"
import { FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { RECEIPT_PAYMENT_METHOD, PAYMENT_METHOD_NAMES } from "@/types/receipt"
import { REFERENCE_TYPES } from "@/types/accounting"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { getIO, shiftUpdateRoom } from "@/lib/socket-server"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import { getOrCreateAccount, createJournalEntry } from "@/services/accounting.service"
import { z } from "zod"

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
  enteredBreakdown?: ShiftHandoverEnteredBreakdown
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

  if (validFrom === validTo) {
    return { success: false, error: "Handover cannot be to yourself. Please select another recipient." }
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
    },
  })

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

/** Approve and receive handover (bulk cashier only): record approval with user and datetime, optional comments; create journal (funds to bulk cashier till), set handover APPROVED, end shift. */
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
    const toAccountResult = await getOrCreateAccount({
      type: "CASH",
      userId: handover.toUserId,
      name: "Till - Cashier",
    })
    if (!toAccountResult.success) {
      return { success: false, error: toAccountResult.error ?? "Could not get or create recipient till." }
    }
    const toAccountId = toAccountResult.account.id

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
      return { success: false, error: journalResult.error ?? "Failed to create handover journal." }
    }
    journalId = journalResult.journalId
  }

  const now = new Date()
  await prisma.shiftHandover.update({
    where: { id: handoverId },
    data: {
      status: HANDOVER_STATUS.APPROVED,
      journalId,
      approvedAt: now,
      approvedBy: approvedByUserId,
      approvalComments: approvalComments?.trim() || null,
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

/** Single handover detail for the recipient (toUserId). Returns null if not found or not the recipient. */
export async function getHandoverByIdForRecipient(handoverId: string, toUserId: string) {
  const handover = await prisma.shiftHandover.findFirst({
    where: { id: handoverId, toUserId, status: HANDOVER_STATUS.PENDING },
    include: {
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true, user: { select: { id: true, name: true } } } },
    },
  })
  return handover
}
