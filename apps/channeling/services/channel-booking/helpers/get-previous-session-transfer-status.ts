import prisma from "@/lib/prisma"
import moment from "moment"

export type PreviousSessionTransferStatus = {
  /** True if transfer into this session is allowed (no previous session, or previous is full). */
  canTransfer: boolean
  /** When canTransfer is false: formatted date and time of the previous session for messages/UI. */
  previousSessionLabel?: string
}

/**
 * For a single session, check if it has a previous consecutive session that must be filled first.
 * Returns canTransfer and, when blocked, previousSessionLabel (e.g. "24 Mar 2026, 9:00 AM – 10:00 AM").
 * Used by transfer-bookings service and get-sessions-transfer-eligibility service.
 */
export async function getPreviousSessionTransferStatus(
  sessionId: string
): Promise<PreviousSessionTransferStatus> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { previousDoctorSession: true, date: true },
  })

  if (!session?.previousDoctorSession) {
    return { canTransfer: true }
  }

  const previousSession = await prisma.session.findFirst({
    where: {
      doctorSessionId: session.previousDoctorSession,
      date: session.date,
    },
    select: {
      appointmentNo: true,
      maxPatientNumber: true,
      date: true,
      startTime: true,
      endTime: true,
    },
  })

  if (!previousSession) {
    return { canTransfer: true }
  }

  const previousFull =
    previousSession.appointmentNo >= previousSession.maxPatientNumber
  if (previousFull) {
    return { canTransfer: true }
  }

  const prevDate = moment(previousSession.date).format("DD MMM YYYY")
  const prevStart = moment(previousSession.startTime).format("h:mm A")
  const prevEnd = moment(previousSession.endTime).format("h:mm A")
  return {
    canTransfer: false,
    previousSessionLabel: `${prevDate}, ${prevStart} – ${prevEnd}`,
  }
}
