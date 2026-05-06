import prisma from "@/lib/prisma"
import { getIO, channelBookingRoom } from "@/lib/socket-server"
import { logActivityNonBlocking } from "@/lib/activity-log"
import {
  appointmentSequenceScopeKey,
  effectiveAppointmentSequenceLastValue,
} from "./helpers/appointment-number"

/** Emits `session-update` with counts, blocks, and sequence cursor (e.g. after block changes or forced booking unblock). */
export async function emitSessionUpdateAfterBlocks(sessionId: string): Promise<void> {
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      doctorId: true,
      appointmentNo: true,
      blockedAppointmentNumbers: true,
    },
  })
  const doctorId = s?.doctorId
  if (!doctorId) return
  const [paidCount, pendingCount] = await Promise.all([
    prisma.booking.count({ where: { sessionId, status: 1 } }),
    prisma.booking.count({ where: { sessionId, status: 0 } }),
  ])
  const seq = await prisma.sequence.findUnique({
    where: { scopeKey: appointmentSequenceScopeKey(sessionId) },
    select: { lastValue: true },
  })
  const sessionStart = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { startingPatientNumber: true },
  })
  const appointmentSequenceLastValue = effectiveAppointmentSequenceLastValue(
    seq?.lastValue ?? null,
    sessionStart?.startingPatientNumber ?? 1
  )
  const io = getIO()
  if (io) {
    io.to(channelBookingRoom(doctorId)).emit("session-update", {
      sessionId,
      appointmentNo: s.appointmentNo,
      paidCount,
      pendingCount,
      blockedAppointmentNumbers: s.blockedAppointmentNumbers ?? [],
      appointmentSequenceLastValue,
    })
  }
}

export type ManageBlocksResult =
  | { success: true; blockedAppointmentNumbers: number[] }
  | { success: false; message: string }

/**
 * Add appointment numbers to the session block list (deduped, in range).
 * Rejects numbers that already have any booking row on this session (any status).
 */
export async function addBlockedAppointmentNumbersService(
  sessionId: string,
  numbers: number[],
  userId: string | null
): Promise<ManageBlocksResult> {
  const unique = [...new Set(numbers.map((n) => Math.floor(Number(n))))].filter((n) => Number.isFinite(n))
  if (unique.length === 0) {
    return { success: false, message: "No valid numbers to block." }
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      startingPatientNumber: true,
      maxPatientNumber: true,
      blockedAppointmentNumbers: true,
    },
  })
  if (!session) {
    return { success: false, message: "Session not found." }
  }
  const { startingPatientNumber: lo, maxPatientNumber: hi } = session
  for (const n of unique) {
    if (n < lo || n > hi) {
      return {
        success: false,
        message: `Numbers must be between ${lo} and ${hi} for this session.`,
      }
    }
    const existing = await prisma.booking.findFirst({
      where: { sessionId, appointmentNo: n },
      select: { id: true },
    })
    if (existing) {
      return {
        success: false,
        message: `Cannot block ${n}: a booking already exists for this appointment number on this session.`,
      }
    }
  }

  const prev = session.blockedAppointmentNumbers ?? []
  const merged = [...new Set([...prev, ...unique])].sort((a, b) => a - b)

  await prisma.session.update({
    where: { id: sessionId },
    data: { blockedAppointmentNumbers: merged },
  })

  if (userId) {
    logActivityNonBlocking({
      userId,
      action: "session.appointment_blocks_added",
      entityType: "Session",
      entityId: sessionId,
      importance: "low",
      metadata: { numbers: unique, operation: "add" as const },
    })
  }

  await emitSessionUpdateAfterBlocks(sessionId)
  return { success: true, blockedAppointmentNumbers: merged }
}

/**
 * Remove numbers from the block list. Only allowed when `n >` effective appointment sequence cursor.
 */
export async function removeBlockedAppointmentNumbersService(
  sessionId: string,
  numbers: number[],
  userId: string | null
): Promise<ManageBlocksResult> {
  const unique = [...new Set(numbers.map((n) => Math.floor(Number(n))))].filter((n) => Number.isFinite(n))
  if (unique.length === 0) {
    return { success: false, message: "No valid numbers to unblock." }
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      startingPatientNumber: true,
      blockedAppointmentNumbers: true,
    },
  })
  if (!session) {
    return { success: false, message: "Session not found." }
  }

  const seq = await prisma.sequence.findUnique({
    where: { scopeKey: appointmentSequenceScopeKey(sessionId) },
    select: { lastValue: true },
  })
  const lastEff = effectiveAppointmentSequenceLastValue(
    seq?.lastValue ?? null,
    session.startingPatientNumber
  )

  for (const n of unique) {
    if (n <= lastEff) {
      return {
        success: false,
        message: `Cannot unblock #${String(n).padStart(2, "0")}: this number is at or below the current appointment sequence (${lastEff}). Add a forced booking for that number instead of removing the block.`,
      }
    }
  }

  const prev = new Set(session.blockedAppointmentNumbers ?? [])
  for (const n of unique) prev.delete(n)
  const merged = [...prev].sort((a, b) => a - b)

  await prisma.session.update({
    where: { id: sessionId },
    data: { blockedAppointmentNumbers: merged },
  })

  if (userId) {
    logActivityNonBlocking({
      userId,
      action: "session.appointment_blocks_removed",
      entityType: "Session",
      entityId: sessionId,
      importance: "low",
      metadata: { numbers: unique, operation: "remove" as const },
    })
  }

  await emitSessionUpdateAfterBlocks(sessionId)
  return { success: true, blockedAppointmentNumbers: merged }
}
