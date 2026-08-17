"use server"

import prisma from "@/lib/prisma"
import { SHIFT_STATUS } from "@/types/shift"
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from "@/types/handover"
import { FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { getIO, shiftUpdateRoom } from "@/lib/socket-server"
import { formatUserDisplayName } from "@/lib/helpers/user-display.helper"
import { ShiftRequirementError } from "@/lib/shift-requirement-error"
import { hasPermission } from "@/lib/permissions"
import { userTypes } from "@/lib/roles"
import {
  getEndsAtForHours,
  getShiftMaxHoursForRole,
} from "@/lib/shift-duration"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import type { Permissions } from "@/types/user-group"
import { z } from "zod"

// ==== SHIFT: VALIDATION SCHEMAS ==== //
const startShiftSchema = z.object({
  userId: z.string().min(1, "User is required").trim(),
  locationId: z.string().trim().optional().nullable(),
})

const shiftActionSchema = z.object({
  shiftId: z.string().min(1, "Shift is required").trim(),
  userId: z.string().min(1, "User is required").trim(),
})

// Shift model is on PrismaClient after prisma generate (see prisma/schema.prisma)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- PrismaClient.shift exists after generate
const shiftModel = (prisma as any).shift

/** True when shift.endsAt has passed (shift must be handed over). */
function isShiftPastMaxDuration(
  shift: { endsAt: Date | string },
  asOf: Date = new Date()
): boolean {
  const endsAt = typeof shift.endsAt === "string" ? new Date(shift.endsAt) : shift.endsAt
  return endsAt.getTime() <= asOf.getTime()
}

async function isBulkCashierUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userType: true,
      userGroup: { select: { permissions: true } },
    },
  })
  if (!user) return false
  // Backend admin has all capabilities; use longer bulk duration when configured.
  if (user.userType === userTypes.admin) return true
  const permissions = (user.userGroup?.permissions ?? null) as Permissions | null
  return hasPermission(permissions, "bulk-cashier", "bulk-cashier-dashboard")
}

export async function getActiveShift(userId: string) {
  const now = new Date()
  const shift = await shiftModel.findFirst({
    where: {
      userId,
      status: SHIFT_STATUS.ACTIVE,
      endsAt: { gt: now },
    },
    orderBy: { startedAt: "desc" },
  })
  return shift
}

const OPEN_SHIFT_STATUSES = [
  SHIFT_STATUS.ACTIVE,
  SHIFT_STATUS.PAUSED,
  SHIFT_STATUS.HANDOVER_PENDING,
] as const

function openShiftStartConflictMessage(shift: { status: number; endsAt: Date | string }): string {
  if (shift.status === SHIFT_STATUS.HANDOVER_PENDING) {
    return "You have a handover pending. Cancel it from the top bar or wait for the recipient to approve before starting a new shift."
  }
  if (isShiftPastMaxDuration(shift)) {
    return "Your previous shift exceeded its time limit. Complete handover from the top bar before starting a new shift."
  }
  if (shift.status === SHIFT_STATUS.PAUSED) {
    return "You already have a paused shift. Resume or end it from the top bar before starting a new one."
  }
  return "You already have an active shift. End it from the top bar before starting a new one."
}

/** True when the user has an open shift (active, paused, or handover pending). */
export async function hasOpenShift(userId: string): Promise<boolean> {
  const shift = await shiftModel.findFirst({
    where: {
      userId,
      status: { in: [...OPEN_SHIFT_STATUSES] },
    },
    select: { id: true },
  })
  return !!shift
}

/**
 * Open (not ended) shift for the user, including past max duration.
 * Expired shifts stay "current" so the user cannot start another until handover completes.
 */
export async function getCurrentShift(userId: string) {
  const shift = await shiftModel.findFirst({
    where: {
      userId,
      status: { in: [...OPEN_SHIFT_STATUSES] },
    },
    orderBy: { startedAt: "desc" },
    include: {
      location: { select: { id: true, name: true, code: true } },
      handovers: {
        where: { status: HANDOVER_STATUS.PENDING },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          cashCents: true,
          cardCents: true,
          slipCents: true,
          checkCents: true,
          creditCents: true,
          eWalletCents: true,
          totalCents: true,
          discrepancyReason: true,
          toUser: { select: { id: true, name: true } },
        },
      },
    },
  })
  return shift
}

/** Throws if the user does not have an ACTIVE shift within its time limit. */
export async function requireActiveShift(userId: string): Promise<void> {
  const shift = await getCurrentShift(userId)
  if (!shift) {
    throw new ShiftRequirementError(
      "You must have an active shift to perform this action. Start or resume a shift from the top bar.",
      "NO_ACTIVE_SHIFT"
    )
  }
  if (isShiftPastMaxDuration(shift)) {
    throw new ShiftRequirementError(
      "Your shift time limit has ended. Complete handover from the top bar before continuing.",
      "SHIFT_EXPIRED"
    )
  }
  if (shift.status === SHIFT_STATUS.HANDOVER_PENDING) {
    throw new ShiftRequirementError("Handover not complete.", "HANDOVER_NOT_COMPLETE")
  }
  if (shift.status !== SHIFT_STATUS.ACTIVE) {
    throw new ShiftRequirementError(
      "Your shift is paused. Resume your shift from the top bar to continue.",
      "SHIFT_PAUSED"
    )
  }
}

export type GetShiftsParams = {
  page?: number
  limit?: number
  dateFrom?: string | null
  dateTo?: string | null
  userId?: string | null
}

/** List shifts for manager view: filter by date range and/or user; server-side pagination. */
export async function getShifts(params: GetShiftsParams) {
  const page = params.page ?? 0
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 100)
  const where: { userId?: string; startedAt?: { gte?: Date; lte?: Date } } = {}
  if (params.userId && params.userId.trim()) {
    where.userId = params.userId.trim()
  }
  if (params.dateFrom || params.dateTo) {
    where.startedAt = {}
    if (params.dateFrom) {
      const from = new Date(params.dateFrom)
      from.setHours(0, 0, 0, 0)
      where.startedAt.gte = from
    }
    if (params.dateTo) {
      const to = new Date(params.dateTo)
      to.setHours(23, 59, 59, 999)
      where.startedAt.lte = to
    }
  }
  const [data, total] = await Promise.all([
    shiftModel.findMany({
      where,
      skip: page * limit,
      take: limit,
      orderBy: { startedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } },
        handovers: { select: { id: true, discrepancyReason: true } },
      },
    }),
    shiftModel.count({ where }),
  ])
  return { data, totalRecords: total }
}

/** Get one shift by id with full detail for manager view. */
export async function getShiftById(id: string) {
  const shift = await shiftModel.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      location: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
      pausedByUser: { select: { id: true, name: true } },
      endedByUser: { select: { id: true, name: true } },
      floatRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          amountRequested: true,
          requestedById: true,
          bulkCashierId: true,
          approvedAt: true,
          receivedAt: true,
          createdAt: true,
        },
      },
      handovers: {
        orderBy: { createdAt: "desc" },
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
      },
    },
  })
  return shift
}

/** Users who have at least one shift (for filter dropdown). Optionally all active users. */
export async function getShiftUserOptions() {
  const users = await prisma.user.findMany({
    where: { status: 1 },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  })
  return users.map((u) => ({ id: u.id, name: u.name || u.id }))
}

/** Users who can receive a shift handover (active users, excluding the given user). */
export async function getHandoverUserOptions(excludeUserId: string) {
  const users = await prisma.user.findMany({
    where: { status: 1, id: { not: excludeUserId } },
    select: { id: true, name: true, staff: { select: { code: true } } },
    orderBy: { name: "asc" },
    take: 500,
  })
  return users.map((u) => ({
    id: u.id,
    name: formatUserDisplayName(u.name, u.id, u.staff?.code),
  }))
}

/** All active shifts (status=ACTIVE, endsAt>now) with user and location for bulk cashier dashboard. */
export async function getActiveShiftsWithUserAndLocation() {
  const now = new Date()
  const shifts = await shiftModel.findMany({
    where: {
      status: SHIFT_STATUS.ACTIVE,
      endsAt: { gt: now },
    },
    orderBy: { startedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      location: { select: { id: true, name: true } },
    },
  })
  return shifts
}

export async function startShift(userId: string, locationId?: string | null) {
  const { userId: validUserId, locationId: validLocationId } = startShiftSchema.parse({ userId, locationId: locationId ?? null })
  const isBulkCashier = await isBulkCashierUser(validUserId)
  const maxHours = getShiftMaxHoursForRole(isBulkCashier)
  const now = new Date()
  const endsAt = getEndsAtForHours(now, maxHours)

  // Check + create in one transaction so two concurrent starts cannot both succeed.
  const shift = await prisma.$transaction(async (tx) => {
    const txShift = (tx as typeof prisma & { shift: typeof shiftModel }).shift
    const existing = await txShift.findFirst({
      where: {
        userId: validUserId,
        status: { in: [...OPEN_SHIFT_STATUSES] },
      },
      select: { id: true, status: true, endsAt: true },
      orderBy: { startedAt: "desc" },
    })
    if (existing) {
      throw new Error(openShiftStartConflictMessage(existing))
    }
    return txShift.create({
      data: {
        userId: validUserId,
        locationId: validLocationId && validLocationId.length > 0 ? validLocationId : null,
        startedAt: now,
        endsAt,
        status: SHIFT_STATUS.ACTIVE,
        createdBy: validUserId,
      },
    })
  })
  logActivityNonBlocking({
    userId: validUserId,
    action: "shift.started",
    entityType: "Shift",
    entityId: shift.id,
    metadata: {
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      maxHours,
      isBulkCashier,
    },
  })
  return shift
}

export async function pauseShift(shiftId: string, userId: string) {
  const { shiftId: validShiftId, userId: validUserId } = shiftActionSchema.parse({ shiftId, userId })
  const shift = await shiftModel.findFirst({
    where: { id: validShiftId, userId: validUserId, status: SHIFT_STATUS.ACTIVE },
  })
  if (!shift) return { success: false, message: "Shift not found or not active" }
  const now = new Date()
  if (isShiftPastMaxDuration(shift, now)) {
    return {
      success: false,
      message: "Shift time limit has ended. Complete handover from the top bar.",
    }
  }
  await shiftModel.update({
    where: { id: validShiftId },
    data: { status: SHIFT_STATUS.PAUSED, pausedAt: now, pausedBy: validUserId, updatedAt: now },
  })
  logActivityNonBlocking({
    userId: validUserId,
    action: "shift.paused",
    entityType: "Shift",
    entityId: validShiftId,
    metadata: { pausedAt: now.toISOString() },
  })
  const io = getIO()
  if (io) io.to(shiftUpdateRoom(validUserId)).emit("shift-update", {})
  return { success: true }
}

export async function resumeShift(shiftId: string, userId: string) {
  const { shiftId: validShiftId, userId: validUserId } = shiftActionSchema.parse({ shiftId, userId })
  const shift = await shiftModel.findFirst({
    where: { id: validShiftId, userId: validUserId, status: SHIFT_STATUS.PAUSED },
  })
  if (!shift) return { success: false, message: "Shift not found or not paused" }
  const now = new Date()
  if (isShiftPastMaxDuration(shift, now)) {
    return {
      success: false,
      message: "Shift time limit has ended. Complete handover from the top bar — you cannot resume this shift.",
    }
  }
  await shiftModel.update({
    where: { id: validShiftId },
    data: { status: SHIFT_STATUS.ACTIVE, updatedAt: now },
  })
  logActivityNonBlocking({
    userId: validUserId,
    action: "shift.resumed",
    entityType: "Shift",
    entityId: validShiftId,
    metadata: { resumedAt: now.toISOString() },
  })
  const io = getIO()
  if (io) io.to(shiftUpdateRoom(validUserId)).emit("shift-update", {})
  return { success: true }
}

/**
 * True when the shift can be closed with no ShiftHandover:
 * till is empty (or missing), nothing to forward, no pending float/handovers to accept.
 */
export async function canEndShiftWithoutHandover(userId: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  const pendingHandoversToMe = await prisma.shiftHandover.count({
    where: { toUserId: userId, status: HANDOVER_STATUS.PENDING },
  })
  if (pendingHandoversToMe > 0) {
    return {
      allowed: false,
      reason:
        "You have handover(s) pending your acceptance. Accept or reject them from the Handovers page before ending your shift.",
    }
  }

  const pendingFloat = await prisma.floatRequest.findFirst({
    where: { requestedById: userId, status: FLOAT_REQUEST_STATUS.PENDING },
    select: { id: true },
  })
  if (pendingFloat) {
    return {
      allowed: false,
      reason:
        "You have a pending float request waiting for approval. Cancel it or wait for approval before ending the shift.",
    }
  }

  const received = await prisma.shiftHandover.findMany({
    where: { toUserId: userId, status: HANDOVER_STATUS.APPROVED },
    select: { id: true, forwardedToHandoverId: true, reconciliationStatus: true },
    take: 50,
  })
  const mustForward = received.some((h) => {
    if (h.forwardedToHandoverId != null) return false
    const status = h.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING
    const heldOrDone =
      status === RECONCILIATION_STATUS.IN_RECONCILIATION ||
      status === RECONCILIATION_STATUS.RECONCILED_APPROVED
    return !heldOrDone
  })
  if (mustForward) {
    return {
      allowed: false,
      reason: "You have received handover(s) that must be included in a handover before ending this shift.",
    }
  }

  let totalCents = 0
  try {
    const breakdown = await getTillBalanceBreakdown(userId)
    totalCents = breakdown.totalCents ?? 0
  } catch {
    // No till / cannot create till (e.g. missing staff) → nothing to hand over.
    totalCents = 0
  }
  if (totalCents !== 0) {
    return {
      allowed: false,
      reason: "Till has a balance. Complete a handover to end this shift.",
    }
  }

  return { allowed: true }
}

export async function endShift(shiftId: string, userId: string) {
  const { shiftId: validShiftId, userId: validUserId } = shiftActionSchema.parse({ shiftId, userId })
  const shift = await shiftModel.findFirst({
    where: {
      id: validShiftId,
      userId: validUserId,
      status: { in: [SHIFT_STATUS.ACTIVE, SHIFT_STATUS.PAUSED] },
    },
  })
  if (!shift) return { success: false, message: "Shift not found" }

  const emptyClose = await canEndShiftWithoutHandover(validUserId)
  if (!emptyClose.allowed) {
    return {
      success: false,
      message:
        emptyClose.reason ??
        (isShiftPastMaxDuration(shift)
          ? "Shift time limit has ended. Complete handover from the top bar — you cannot end this shift without handover."
          : "Cannot end this shift without a handover."),
    }
  }

  const now = new Date()
  await shiftModel.update({
    where: { id: validShiftId },
    data: { status: SHIFT_STATUS.ENDED, endedAt: now, endedBy: validUserId, updatedAt: now },
  })
  logActivityNonBlocking({
    userId: validUserId,
    action: "shift.ended",
    entityType: "Shift",
    entityId: validShiftId,
    metadata: {
      endedAt: now.toISOString(),
      withoutHandover: true,
      pastMaxDuration: isShiftPastMaxDuration(shift),
    },
  })
  const io = getIO()
  if (io) io.to(shiftUpdateRoom(validUserId)).emit("shift-update", {})
  return { success: true }
}
