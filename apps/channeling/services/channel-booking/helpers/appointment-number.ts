import type { Prisma } from "@prisma/client"

export function appointmentSequenceScopeKey(sessionId: string): string {
  return `appointment:${sessionId}`
}

export type SessionAppointmentAllocationRow = {
  startingPatientNumber: number
  maxPatientNumber: number
  blockedAppointmentNumbers: number[] | null | undefined
}

/** Any booking row on this session with this number (any status) consumes the slot. */
export async function getOccupiedAppointmentNumbers(
  tx: Prisma.TransactionClient,
  sessionId: string
): Promise<Set<number>> {
  const rows = await tx.booking.findMany({
    where: { sessionId },
    select: { appointmentNo: true },
  })
  return new Set(rows.map((r) => r.appointmentNo))
}

export function computeNextAutoAppointmentNumber(args: {
  sequenceLastValue: number | null | undefined
  startingPatientNumber: number
  maxPatientNumber: number
  blocked: ReadonlySet<number>
  occupied: ReadonlySet<number>
}): { ok: true; value: number } | { ok: false } {
  const startFrom = args.startingPatientNumber
  const max = args.maxPatientNumber
  const rawLast = args.sequenceLastValue ?? startFrom - 1
  const lastEffective = rawLast < startFrom - 1 ? startFrom - 1 : rawLast
  let candidate = Math.max(lastEffective + 1, startFrom)
  while (candidate <= max) {
    if (!args.blocked.has(candidate) && !args.occupied.has(candidate)) {
      return { ok: true, value: candidate }
    }
    candidate += 1
  }
  return { ok: false }
}

/** Advance monotonic appointment sequence cursor (never decreases). */
export async function advanceAppointmentSequenceCursor(
  tx: Prisma.TransactionClient,
  sessionId: string,
  assignedAppointmentNo: number
): Promise<void> {
  const scopeKey = appointmentSequenceScopeKey(sessionId)
  const seq = await tx.sequence.findUnique({
    where: { scopeKey },
    select: { lastValue: true },
  })
  const prev = seq?.lastValue ?? assignedAppointmentNo - 1
  const next = Math.max(prev, assignedAppointmentNo)
  await tx.sequence.upsert({
    where: { scopeKey },
    create: { scopeKey, lastValue: next },
    update: { lastValue: next },
  })
}

export async function getAppointmentSequenceLastValueRaw(
  tx: Prisma.TransactionClient,
  sessionId: string
): Promise<number | null> {
  const scopeKey = appointmentSequenceScopeKey(sessionId)
  const seq = await tx.sequence.findUnique({
    where: { scopeKey },
    select: { lastValue: true },
  })
  return seq?.lastValue ?? null
}

/** Effective last value for UI unblock rule: DB row or `startingPatientNumber - 1`. */
export function effectiveAppointmentSequenceLastValue(
  rawLast: number | null | undefined,
  startingPatientNumber: number
): number {
  const floor = startingPatientNumber - 1
  if (rawLast == null) return floor
  return rawLast < floor ? floor : rawLast
}

/**
 * Greedy simulation: how many successive auto assignments fit from current DB state.
 */
export type PrepareAppointmentNumberResult =
  | { ok: true; appointmentNo: number }
  | {
      ok: false
      code:
        | "LIMIT_EXCEEDED"
        | "INVALID_FORCED"
        | "OCCUPIED"
        | "FORCE_FLAG_REQUIRED"
        | "FORCED_ONLY_BLOCKED"
        | "ONLY_NEXT_AUTO_ALLOWED"
      message: string
    }

/**
 * Resolve the next `appointmentNo` inside a transaction (before `booking.create`).
 * Does not update `Sequence` — caller must call `advanceAppointmentSequenceCursor` after successful create.
 */
export async function prepareAppointmentNumberForNewBookingTx(
  tx: Prisma.TransactionClient,
  sessionId: string,
  sessionRow: SessionAppointmentAllocationRow & { appointmentNo: number },
  input: {
    forcedAppointmentNo?: number | null
    forceAppointmentNo?: boolean
  }
): Promise<PrepareAppointmentNumberResult> {
  const startFrom = sessionRow.startingPatientNumber
  const max = sessionRow.maxPatientNumber
  const blocked = new Set(sessionRow.blockedAppointmentNumbers ?? [])
  const occupied = await getOccupiedAppointmentNumbers(tx, sessionId)
  const rawSeq = await getAppointmentSequenceLastValueRaw(tx, sessionId)
  const seqEffective = effectiveAppointmentSequenceLastValue(rawSeq, startFrom)
  const minAuto = Math.max(seqEffective + 1, startFrom)

  if (input.forcedAppointmentNo != null && Number.isFinite(input.forcedAppointmentNo)) {
    const n = Math.floor(Number(input.forcedAppointmentNo))
    if (n < startFrom || n > max) {
      return {
        ok: false,
        code: "INVALID_FORCED",
        message: `Appointment number must be between ${startFrom} and ${max}.`,
      }
    }
    if (occupied.has(n)) {
      return {
        ok: false,
        code: "OCCUPIED",
        message: "That appointment number is already used for this session.",
      }
    }
    if (input.forceAppointmentNo === true && !blocked.has(n)) {
      return {
        ok: false,
        code: "FORCED_ONLY_BLOCKED",
        message:
          "Forced booking is only allowed for appointment numbers that are blocked on this session.",
      }
    }
    if (input.forceAppointmentNo === true && n > minAuto) {
      return {
        ok: false,
        code: "INVALID_FORCED",
        message: `Cannot force future blocked number ${n}. Current next number is ${minAuto}.`,
      }
    }
    if (input.forceAppointmentNo !== true && n > minAuto) {
      return {
        ok: false,
        code: "ONLY_NEXT_AUTO_ALLOWED",
        message: `Cannot pick a future appointment number (${n}). The next available number is ${minAuto}.`,
      }
    }
    const needsForce = blocked.has(n) || n < minAuto
    if (needsForce && !input.forceAppointmentNo) {
      return {
        ok: false,
        code: "FORCE_FLAG_REQUIRED",
        message:
          "This appointment number requires a forced booking (blocked or below the next auto number). Enable force and try again.",
      }
    }
    return { ok: true, appointmentNo: n }
  }

  const next = computeNextAutoAppointmentNumber({
    sequenceLastValue: rawSeq,
    startingPatientNumber: startFrom,
    maxPatientNumber: max,
    blocked,
    occupied,
  })
  if (!next.ok) {
    return {
      ok: false,
      code: "LIMIT_EXCEEDED",
      message: "Appointment Limit Exceed.",
    }
  }
  return { ok: true, appointmentNo: next.value }
}

export async function countSequentialAutoAssignmentsAvailable(
  tx: Prisma.TransactionClient,
  sessionId: string,
  session: SessionAppointmentAllocationRow,
  transferCount: number
): Promise<number> {
  const blocked = new Set(session.blockedAppointmentNumbers ?? [])
  const occupiedInitial = await getOccupiedAppointmentNumbers(tx, sessionId)
  const occupied = new Set(occupiedInitial)
  const rawSeq = await getAppointmentSequenceLastValueRaw(tx, sessionId)
  /** Simulated `Sequence.lastValue` after each hypothetical assign (same as DB rule). */
  let simLast: number | null = rawSeq
  let assigned = 0
  for (let i = 0; i < transferCount; i++) {
    const next = computeNextAutoAppointmentNumber({
      sequenceLastValue: simLast,
      startingPatientNumber: session.startingPatientNumber,
      maxPatientNumber: session.maxPatientNumber,
      blocked,
      occupied,
    })
    if (!next.ok) break
    occupied.add(next.value)
    simLast = next.value
    assigned += 1
  }
  return assigned
}
