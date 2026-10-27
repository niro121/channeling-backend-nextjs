import type { Prisma } from "@prisma/client"
import moment from "moment"
import { logActivityNonBlocking } from "@/lib/activity-log"

/** Not a DoctorSession id. Session.doctorSessionId is a required string, not a relation. */
export const HIDDEN_SESSION_DOCTOR_SESSION_ID = "hidden-wht"

/** Older sessions have no hidden field. Only an explicit true is hidden. */
export function isHiddenSession(hidden: boolean | null | undefined): boolean {
  return hidden === true
}

type Tx = Prisma.TransactionClient

export type HiddenSessionMoveLog = {
  action: "booking.moved-to-hidden-session" | "booking.restored-from-hidden-session"
  bookingId: string
  fromSessionId: string
  toSessionId: string
  appointmentNo: number
  before: string
  after: string
}

function padAppointment(n: number): string {
  return String(n).padStart(2, "0")
}

function bookingLabel(title: string | null | undefined, name: string | null | undefined): string {
  return [title, name].filter(Boolean).join(" ").trim() || "—"
}

function formatWhen(value: Date | number): string {
  return typeof value === "number"
    ? moment.unix(value).format("DD-MM-YYYY hh:mm A")
    : moment(value).format("DD-MM-YYYY hh:mm A")
}

function dayKey(date: Date): string {
  return moment(date).format("YYYY-MM-DD")
}

function dayBounds(date: Date): { start: Date; end: Date } {
  return {
    start: moment(date).startOf("day").toDate(),
    end: moment(date).endOf("day").toDate(),
  }
}

export function logHiddenSessionMoves(userId: string | null | undefined, entries: HiddenSessionMoveLog[]): void {
  if (!userId) return
  for (const entry of entries) {
    const metadata = {
      bookingId: entry.bookingId,
      before: entry.before,
      after: entry.after,
      fromSessionId: entry.fromSessionId,
      toSessionId: entry.toSessionId,
      appointmentNo: entry.appointmentNo,
    }
    logActivityNonBlocking({
      userId,
      action: entry.action,
      entityType: "Booking",
      entityId: entry.bookingId,
      metadata,
    })
    logActivityNonBlocking({
      userId,
      action: entry.action,
      entityType: "Session",
      entityId: entry.fromSessionId,
      metadata: { ...metadata, direction: "outgoing" },
    })
    logActivityNonBlocking({
      userId,
      action: entry.action,
      entityType: "Session",
      entityId: entry.toSessionId,
      metadata: { ...metadata, direction: "incoming" },
    })
  }
}

type SourceSession = {
  id: string
  institution: number
  date: Date
  startTime: Date
  startingPatientNumber: number
  maxPatientNumber: number
  refundable: number
  fees: Prisma.JsonValue
  amountLocal: number | null
  amountForeign: number | null
  isScan: boolean
  doctorId: string | null
  departmentId: string | null
  locationId: string | null
  roomId: string | null
}

type MovingBooking = {
  id: string
  appointmentNo: number
  title: string
  name: string
  sessionStartTime: number
  sessionId: string | null
  locationId: string | null
  session: SourceSession | null
}

/**
 * Move non-WHT bookings onto one hidden session per doctor, branch, and day.
 * Only sessionId changes. Appointment numbers stay as they are.
 */
export async function moveNonWhtBookingsToHiddenSession(
  tx: Tx,
  args: { bookingIds: string[]; doctorId: string; userId?: string | null }
): Promise<HiddenSessionMoveLog[]> {
  if (args.bookingIds.length === 0) return []

  const bookings = await tx.booking.findMany({
    where: { id: { in: args.bookingIds } },
    select: {
      id: true,
      appointmentNo: true,
      title: true,
      name: true,
      sessionStartTime: true,
      sessionId: true,
      locationId: true,
      session: {
        select: {
          id: true,
          institution: true,
          date: true,
          startTime: true,
          startingPatientNumber: true,
          maxPatientNumber: true,
          refundable: true,
          fees: true,
          amountLocal: true,
          amountForeign: true,
          isScan: true,
          doctorId: true,
          departmentId: true,
          locationId: true,
          roomId: true,
          hidden: true,
        },
      },
    },
  })

  const movable = bookings.filter((booking) => booking.session && booking.session.hidden !== true)
  if (movable.length === 0) return []

  const groups = new Map<string, MovingBooking[]>()
  for (const booking of movable) {
    const session = booking.session
    if (!session) continue
    const locationId = booking.locationId ?? session.locationId
    if (!locationId) {
      throw new Error("A booking has no branch, so it cannot move to a hidden session.")
    }
    const key = `${locationId}|${dayKey(session.date)}`
    const list = groups.get(key) ?? []
    list.push({ ...booking, locationId, session })
    groups.set(key, list)
  }

  const logs: HiddenSessionMoveLog[] = []
  const movedAt = new Date()

  for (const group of groups.values()) {
    const locationId = group[0]?.locationId
    const template = latestSession(group)
    if (!locationId || !template) {
      throw new Error("A booking has no session, so it cannot move to a hidden session.")
    }

    const hidden = await ensureHiddenSession(tx, {
      doctorId: args.doctorId,
      locationId,
      template,
      userId: args.userId,
      appointmentNos: group.map((booking) => booking.appointmentNo),
    })

    for (const booking of group) {
      if (!booking.sessionId || !booking.session) continue
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          sessionId: hidden.id,
          appointmentNoTieBreaker: booking.id,
          movedFromSessionId: booking.sessionId,
          movedFromSessionStartTime: booking.sessionStartTime,
          movedBy: args.userId ?? undefined,
          movedAt,
          movedRemarks: "Moved to hidden session",
          updatedBy: args.userId ?? undefined,
        },
      })
      const label = bookingLabel(booking.title, booking.name)
      const appointment = padAppointment(booking.appointmentNo)
      logs.push({
        action: "booking.moved-to-hidden-session",
        bookingId: booking.id,
        fromSessionId: booking.sessionId,
        toSessionId: hidden.id,
        appointmentNo: booking.appointmentNo,
        before: `Appointment No.${appointment} (${label}) from session on ${formatWhen(booking.sessionStartTime)}`,
        after: `Hidden session on ${formatWhen(hidden.startTime)} as Appointment No.${appointment} (${label})`,
      })
    }
  }

  return logs
}

/**
 * Send hidden-session bookings back to the session they left. Appointment numbers stay the same.
 * Called for the receipts in a doctor-payment cancel, before doctor payment is cleared.
 */
export async function restoreBookingsFromHiddenSession(
  tx: Tx,
  args: { receiptIds: string[]; userId?: string | null }
): Promise<HiddenSessionMoveLog[]> {
  if (args.receiptIds.length === 0) return []

  const bookings = await tx.booking.findMany({
    where: {
      doctorPaymentReceiptId: { in: args.receiptIds },
      session: { is: { hidden: true } },
    },
    select: {
      id: true,
      appointmentNo: true,
      title: true,
      name: true,
      sessionId: true,
      sessionStartTime: true,
      movedFromSessionId: true,
      session: { select: { id: true, startTime: true } },
    },
  })
  if (bookings.length === 0) return []

  const logs: HiddenSessionMoveLog[] = []

  for (const booking of bookings) {
    if (!booking.sessionId || !booking.movedFromSessionId) {
      throw new Error(
        "A booking on the hidden session has no previous session, so this doctor payment cannot be canceled."
      )
    }
    const previous = await tx.session.findUnique({
      where: { id: booking.movedFromSessionId },
      select: { id: true, startTime: true, hidden: true },
    })
    if (!previous || previous.hidden) {
      throw new Error("The previous session is not available, so this doctor payment cannot be canceled.")
    }
    const taken = await tx.booking.findFirst({
      where: {
        sessionId: previous.id,
        appointmentNo: booking.appointmentNo,
        id: { not: booking.id },
      },
      select: { id: true },
    })
    if (taken) {
      throw new Error(
        `Appointment number ${booking.appointmentNo} is already taken on the previous session, so this doctor payment cannot be canceled.`
      )
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        sessionId: previous.id,
        appointmentNoTieBreaker: null,
        movedFromSessionId: null,
        movedFromSessionStartTime: null,
        movedBy: null,
        movedAt: null,
        movedRemarks: null,
        updatedBy: args.userId ?? undefined,
      },
    })

    const label = bookingLabel(booking.title, booking.name)
    const appointment = padAppointment(booking.appointmentNo)
    const hiddenStart = booking.session?.startTime ?? booking.sessionStartTime
    logs.push({
      action: "booking.restored-from-hidden-session",
      bookingId: booking.id,
      fromSessionId: booking.sessionId,
      toSessionId: previous.id,
      appointmentNo: booking.appointmentNo,
      before: `Appointment No.${appointment} (${label}) on hidden session ${formatWhen(hiddenStart)}`,
      after: `Previous session on ${formatWhen(previous.startTime)} as Appointment No.${appointment} (${label})`,
    })
  }

  return logs
}

function latestSession(group: MovingBooking[]): SourceSession | null {
  let best: SourceSession | null = null
  let bestStart = Number.NEGATIVE_INFINITY
  for (const booking of group) {
    const session = booking.session
    if (!session) continue
    const start = new Date(session.startTime).getTime()
    if (start >= bestStart) {
      best = session
      bestStart = start
    }
  }
  return best
}

async function ensureHiddenSession(
  tx: Tx,
  args: {
    doctorId: string
    locationId: string
    template: SourceSession
    userId?: string | null
    appointmentNos: number[]
  }
): Promise<{ id: string; startTime: Date }> {
  const { start: dayStart, end: dayEnd } = dayBounds(args.template.date)
  const existing = await tx.session.findFirst({
    where: {
      doctorId: args.doctorId,
      locationId: args.locationId,
      hidden: true,
      doctorSessionId: HIDDEN_SESSION_DOCTOR_SESSION_ID,
      date: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, startTime: true, maxPatientNumber: true, appointmentNo: true },
  })

  const daySessions = await tx.session.findMany({
    where: {
      doctorId: args.doctorId,
      locationId: args.locationId,
      date: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { startTime: "desc" },
    select: { startTime: true, hidden: true },
  })
  const lastReal = daySessions.find((session) => !isHiddenSession(session.hidden))
  const anchor = lastReal?.startTime ?? args.template.startTime
  const startTime = new Date(new Date(anchor).getTime() + 60_000)
  const endTime = new Date(startTime.getTime() + 60_000)
  const highestAppointment = args.appointmentNos.reduce((max, n) => Math.max(max, n), 0)

  if (existing) {
    const nextStart =
      new Date(existing.startTime).getTime() < startTime.getTime() ? startTime : existing.startTime
    const nextEnd = new Date(new Date(nextStart).getTime() + 60_000)
    const updated = await tx.session.update({
      where: { id: existing.id },
      data: {
        startTime: nextStart,
        endTime: nextEnd,
        durationMinutes: 1,
        maxPatientNumber: Math.max(existing.maxPatientNumber, highestAppointment),
        appointmentNo: Math.max(existing.appointmentNo, highestAppointment),
      },
      select: { id: true, startTime: true },
    })
    return updated
  }

  const created = await tx.session.create({
    data: {
      institution: args.template.institution,
      date: args.template.date,
      doctorSessionId: HIDDEN_SESSION_DOCTOR_SESSION_ID,
      startTime,
      endTime,
      durationMinutes: 1,
      startingPatientNumber: args.template.startingPatientNumber,
      maxPatientNumber: Math.max(args.template.maxPatientNumber, highestAppointment),
      refundable: args.template.refundable,
      fees: args.template.fees as Prisma.InputJsonValue,
      amountLocal: args.template.amountLocal,
      amountForeign: args.template.amountForeign,
      status: 1,
      appointmentNo: highestAppointment,
      isScan: args.template.isScan,
      hidden: true,
      remarks: "Hidden session",
      doctorId: args.doctorId,
      departmentId: args.template.departmentId,
      locationId: args.locationId,
      roomId: args.template.roomId,
      createdBy: args.userId ?? undefined,
      updatedBy: args.userId ?? undefined,
    },
    select: { id: true, startTime: true },
  })
  return created
}
