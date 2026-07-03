"use server"

import prisma from "@/lib/prisma"
import { SHIFT_STATUS } from "@/types/shift"
import { HANDOVER_STATUS } from "@/types/handover"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { getIO, shiftUpdateRoom } from "@/lib/socket-server"
import { z } from "zod"

const SHIFT_MAX_HOURS =
  Number(process.env.SHIFT_MAX_DURATION_HOURS) || 36

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

/** Shift end = start + exactly N hours (milliseconds to avoid DST quirks). */
function getEndsAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + SHIFT_MAX_HOURS * 60 * 60 * 1000)
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

export async function getCurrentShift(userId: string) {
  const shift = await shiftModel.findFirst({
    where: {
      userId,
      status: { in: [SHIFT_STATUS.ACTIVE, SHIFT_STATUS.PAUSED, SHIFT_STATUS.HANDOVER_PENDING] },
    },
    orderBy: { startedAt: "desc" },
    include: {
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
  if (!shift) return null
  const now = new Date()
  if (shift.endsAt <= now) return null
  return shift
}

/** Throws if the user does not have an ACTIVE shift. Use before creating till-related receipts. */
export async function requireActiveShift(userId: string): Promise<void> {
  const shift = await getCurrentShift(userId)
  if (!shift) {
    throw new Error("You must have an active shift to perform this action. Start or resume a shift from the top bar.")
  }
  if (shift.status !== SHIFT_STATUS.ACTIVE) {
    throw new Error(
      "Your shift is not active (paused or handover pending). Resume your shift or complete the handover to create receipts."
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
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 500,
  })
  return users.map((u) => ({ id: u.id, name: u.name || u.id }))
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
  const existing = await getCurrentShift(validUserId)
  if (existing) {
    const msg =
      existing.status === SHIFT_STATUS.HANDOVER_PENDING
        ? "You have a handover pending. Cancel it from the top bar or wait for the recipient to approve before starting a new shift."
        : "You already have an active or paused shift. Please end it or resume it from the top bar before starting a new one."
    throw new Error(msg)
  }
  const now = new Date()
  const startedAt = now
  const endsAt = getEndsAt(startedAt)
  const shift = await shiftModel.create({
    data: {
      userId: validUserId,
      locationId: validLocationId && validLocationId.length > 0 ? validLocationId : null,
      startedAt,
      endsAt,
      status: SHIFT_STATUS.ACTIVE,
      createdBy: validUserId,
    },
  })
  logActivityNonBlocking({
    userId: validUserId,
    action: "shift.started",
    entityType: "Shift",
    entityId: shift.id,
    metadata: { startedAt: startedAt.toISOString(), endsAt: endsAt.toISOString() },
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
  if (shift.endsAt <= now) return { success: false, message: "Shift has expired" }
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

  const pendingHandoversToMe = await prisma.shiftHandover.count({
    where: { toUserId: validUserId, status: HANDOVER_STATUS.PENDING },
  })
  if (pendingHandoversToMe > 0) {
    return {
      success: false,
      message: "You have handover(s) pending your acceptance. Accept or reject them from the Handovers page before ending your shift.",
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
    metadata: { endedAt: now.toISOString() },
  })
  return { success: true }
}
