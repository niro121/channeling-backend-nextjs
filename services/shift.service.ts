"use server"

import prisma from "@/lib/prisma"
import { SHIFT_STATUS } from "@/types/shift"
import { logActivity } from "@/lib/activity-log"
import { z } from "zod"

const SHIFT_MAX_HOURS =
  Number(process.env.SHIFT_MAX_DURATION_HOURS) || 36

// ==== SHIFT: VALIDATION SCHEMAS ==== //
const startShiftSchema = z.object({
  userId: z.string().min(1, "User is required").trim(),
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
      status: { in: [SHIFT_STATUS.ACTIVE, SHIFT_STATUS.PAUSED] },
    },
    orderBy: { startedAt: "desc" },
  })
  if (!shift) return null
  const now = new Date()
  if (shift.endsAt <= now) return null
  return shift
}

export async function startShift(userId: string) {
  const { userId: validUserId } = startShiftSchema.parse({ userId })
  const existing = await getCurrentShift(validUserId)
  if (existing) {
    throw new Error(
      "You already have an active or paused shift. Please end it or resume it from the top bar before starting a new one."
    )
  }
  const now = new Date()
  const startedAt = now
  const endsAt = getEndsAt(startedAt)
  const shift = await shiftModel.create({
    data: {
      userId: validUserId,
      startedAt,
      endsAt,
      status: SHIFT_STATUS.ACTIVE,
      createdBy: validUserId,
    },
  })
  await logActivity({
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
  await logActivity({
    userId: validUserId,
    action: "shift.paused",
    entityType: "Shift",
    entityId: validShiftId,
    metadata: { pausedAt: now.toISOString() },
  })
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
  await logActivity({
    userId: validUserId,
    action: "shift.resumed",
    entityType: "Shift",
    entityId: validShiftId,
    metadata: { resumedAt: now.toISOString() },
  })
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
  const now = new Date()
  await shiftModel.update({
    where: { id: validShiftId },
    data: { status: SHIFT_STATUS.ENDED, endedAt: now, endedBy: validUserId, updatedAt: now },
  })
  await logActivity({
    userId: validUserId,
    action: "shift.ended",
    entityType: "Shift",
    entityId: validShiftId,
    metadata: { endedAt: now.toISOString() },
  })
  return { success: true }
}
