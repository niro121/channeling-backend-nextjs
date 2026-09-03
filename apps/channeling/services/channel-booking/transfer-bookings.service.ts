"use server"

import prisma from "@/lib/prisma"
import moment from "moment"
import {
  advanceAppointmentSequenceCursor,
  countSequentialAutoAssignmentsAvailable,
  getPreviousSessionTransferStatus,
  prepareAppointmentNumberForNewBookingTx,
} from "./helpers"
import { sendSms } from "@/lib/helpers/sms/send-sms"
import { logActivityNonBlocking } from "@/lib/activity-log"

export type TransferBookingsInput = {
  bookingIds: string[]
  doctorId: string
  sessionId: string
  currentSessionId: string
  remarks: string
}

export type TransferBookingsResult =
  | { success: true }
  | { success: false; errorCode: string; message: string }

/** SMS template type 3 = Appointment Reschedule (transfer). Placeholders: {doctor}, {date}, {start_time}. */
const SMS_TEMPLATE_TYPE_TRANSFER = 3
const DEFAULT_TRANSFER_MESSAGE =
  "Your channeling appointment has been transferred to {doctor} on {date} at {start_time}."

async function getSmsTemplateMessage(type: number): Promise<string | null> {
  const model = (prisma as { smsTemplate?: { findFirst: (args: object) => Promise<{ message: string } | null> } })
    .smsTemplate
  if (!model) return null
  const template = await model.findFirst({
    where: { type, status: 1 },
    select: { message: true },
    orderBy: { updatedAt: "desc" },
  })
  return template?.message?.trim() ?? null
}

/**
 * Transfer one or more bookings to another doctor's session.
 * Validates: no doctor-payment receipts, all bookings from today, then updates each booking
 * and sends SMS (transfer template with {doctor}, {date}, {start_time}).
 */
export async function transferBookingsService(
  input: TransferBookingsInput,
  userId: string | null
): Promise<TransferBookingsResult> {
  const { bookingIds, doctorId, sessionId, currentSessionId, remarks } = input

  // Prevent no-op transfers.
  if (sessionId === currentSessionId) {
    return { success: false, errorCode: "same_session", message: "Cannot transfer to the same session." }
  }

  if (!bookingIds.length) {
    return { success: false, errorCode: "invalid_input", message: "No bookings selected." }
  }
  if (!remarks.trim()) {
    return { success: false, errorCode: "invalid_input", message: "Transfer remarks are required." }
  }

  // Load target session and doctor for updates and SMS
  const [targetSession, currentSession, bookingObjs] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { doctor: { select: { id: true, title: true, name: true } } },
    }),
    prisma.session.findUnique({
      where: { id: currentSessionId },
      include: { doctor: { select: { title: true, name: true } } },
    }),
    prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      orderBy: { appointmentNo: "asc" },
      select: {
        id: true,
        appointmentNo: true,
        sessionStartTime: true,
        sessionId: true,
        phone: true,
        title: true,
        name: true,
        status: true,
        refund: true,
        doctorPayment: true,
      },
    }),
  ])

  if (!targetSession || !targetSession.doctor) {
    return { success: false, errorCode: "invalid_session", message: "Target session not found." }
  }
  // status 1 = ACTIVE, 0 = LEAVE — do not allow transfer to a session on leave
  if (targetSession.status === 0) {
    return {
      success: false,
      errorCode: "session_on_leave",
      message: "The selected session is on leave and cannot receive transfers. Please choose an active session.",
    }
  }
  if (!currentSession) {
    return { success: false, errorCode: "invalid_session", message: "Current session not found." }
  }
  const alreadyPaidCount = bookingObjs.filter((b) => b.doctorPayment === true).length
  if (alreadyPaidCount > 0) {
    return {
      success: false,
      errorCode: "doctor_paid",
      message: "Found already paid bookings (doctor payment). Cannot transfer.",
    }
  }
  if (bookingObjs.length !== bookingIds.length) {
    return { success: false, errorCode: "invalid_input", message: "Some bookings not found." }
  }

  const canceledOrRefundedCount = bookingObjs.filter(
    (b) => b.status === 2 || b.status === 3 || (b.refund != null && b.refund !== 0)
  ).length
  if (canceledOrRefundedCount > 0) {
    return {
      success: false,
      errorCode: "refunded_booking",
      message:
        "Canceled or refunded bookings cannot be transferred. Please remove them from the selection.",
    }
  }

  const { findOpenApprovalForBooking } = await import("@/services/approval-request.service")
  for (const b of bookingObjs) {
    const open = await findOpenApprovalForBooking(b.id)
    if (open) {
      return {
        success: false,
        errorCode: "approval_pending",
        message:
          "A selected booking has an open cancel or refund request and cannot be transferred.",
      }
    }
  }

  const todayStart = moment().startOf("day").unix()
  for (const b of bookingObjs) {
    if (b.sessionStartTime < todayStart) {
      return {
        success: false,
        errorCode: "previous_day",
        message: "Sorry, previous day bookings cannot be transferred.",
      }
    }
  }

  // Pre-check: ensure target session has room for all selected auto assignments (blocked + occupied + sequence).
  const slotsLeft = await prisma.$transaction(async (tx) =>
    countSequentialAutoAssignmentsAvailable(
      tx,
      sessionId,
      {
        startingPatientNumber: targetSession.startingPatientNumber,
        maxPatientNumber: targetSession.maxPatientNumber,
        blockedAppointmentNumbers: targetSession.blockedAppointmentNumbers ?? [],
      },
      bookingObjs.length
    )
  )
  if (slotsLeft < bookingObjs.length) {
    return {
      success: false,
      errorCode: "limitexceeded",
      message: `Target session has room for ${slotsLeft} more appointment(s). You selected ${bookingObjs.length}. Please reduce the selection or choose another session.`,
    }
  }

  // Consecutive session rule: if target has a previous session (same day), it must be full before transferring here
  const prevStatus = await getPreviousSessionTransferStatus(sessionId)
  if (!prevStatus.canTransfer && prevStatus.previousSessionLabel) {
    return {
      success: false,
      errorCode: "previous_session_not_full",
      message: `Fill the previous session first (${prevStatus.previousSessionLabel}) before transferring to this session.`,
    }
  }

  const targetStartTime =
    targetSession.startTime instanceof Date
      ? Math.floor(targetSession.startTime.getTime() / 1000)
      : Number(targetSession.startTime)
  const targetEndTime =
    targetSession.endTime instanceof Date
      ? Math.floor(targetSession.endTime.getTime() / 1000)
      : Number(targetSession.endTime)
  const currentStartTime =
    currentSession.startTime instanceof Date
      ? Math.floor(currentSession.startTime.getTime() / 1000)
      : Number(currentSession.startTime)

  const movedAt = new Date()
  const targetDoctorName = [targetSession.doctor.title, targetSession.doctor.name].filter(Boolean).join(" ")
  const currentDoctorName =
    currentSession.doctor != null
      ? [currentSession.doctor.title, currentSession.doctor.name].filter(Boolean).join(" ")
      : "—"
  const doctorName = targetDoctorName
  const targetDateStr =
    targetSession.date instanceof Date
      ? moment(targetSession.date).format("DD-MM-YYYY")
      : moment(targetSession.date).format("DD-MM-YYYY")
  const targetTimeStr =
    targetSession.startTime instanceof Date
      ? moment(targetSession.startTime).format("hh:mm A")
      : moment.unix(targetStartTime).format("hh:mm A")

  try {
    await prisma.$transaction(async (tx) => {
      for (const booking of bookingObjs) {
        const sessionRow = await tx.session.findUnique({
          where: { id: sessionId },
          select: {
            appointmentNo: true,
            startingPatientNumber: true,
            maxPatientNumber: true,
            blockedAppointmentNumbers: true,
          },
        })
        if (!sessionRow) {
          throw new Error("target_session_missing")
        }
        const prep = await prepareAppointmentNumberForNewBookingTx(tx, sessionId, sessionRow, {})
        if (!prep.ok) {
          const err = new Error(prep.message) as Error & {
            transferPrepFail: typeof prep
          }
          err.transferPrepFail = prep
          throw err
        }
        const newAppointmentNo = prep.appointmentNo

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            doctorId,
            sessionId,
            sessionStartTime: targetStartTime,
            sessionEndTime: targetEndTime,
            appointmentNo: newAppointmentNo,
            movedFromSessionId: currentSessionId,
            movedFromSessionStartTime: currentStartTime,
            movedBy: userId ?? undefined,
            movedAt,
            movedRemarks: remarks.trim(),
            updatedBy: userId ?? undefined,
          },
        })
        await advanceAppointmentSequenceCursor(tx, sessionId, newAppointmentNo)
        await tx.session.update({
          where: { id: sessionId },
          data: {
            appointmentNo: Math.max(sessionRow.appointmentNo, newAppointmentNo),
          },
        })

        const bookingName = [booking.title, booking.name].filter(Boolean).join(" ").trim() || "—"
        const beforeDesc = `Transfer of Appointment No.${String(booking.appointmentNo).padStart(2, "0")} (${bookingName}) from ${currentDoctorName}'s session on ${moment.unix(booking.sessionStartTime).format("DD-MM-YYYY hh:mm A")}`

        const updated = await tx.booking.findUnique({
          where: { id: booking.id },
          select: { appointmentNo: true, sessionStartTime: true },
        })
        const afterDesc = updated
          ? `Changed to Appointment No.${String(updated.appointmentNo).padStart(2, "0")} (${bookingName}) in ${targetDoctorName}'s session on ${moment.unix(updated.sessionStartTime).format("DD-MM-YYYY hh:mm A")}`
          : ""

        if (userId) {
          const transferMetadata = {
            bookingId: booking.id,
            remarks: remarks.trim(),
            before: beforeDesc,
            after: afterDesc,
            fromSessionId: currentSessionId,
            toSessionId: sessionId,
            toDoctorId: doctorId,
            newAppointmentNo,
          }
          logActivityNonBlocking({
            userId,
            action: "booking.transferred",
            entityType: "Booking",
            entityId: booking.id,
            metadata: transferMetadata,
          })
          logActivityNonBlocking({
            userId,
            action: "booking.transferred",
            entityType: "Session",
            entityId: currentSessionId,
            metadata: { ...transferMetadata, direction: "outgoing" },
          })
          logActivityNonBlocking({
            userId,
            action: "booking.transferred",
            entityType: "Session",
            entityId: sessionId,
            metadata: { ...transferMetadata, direction: "incoming" },
          })
        }
      }
    })
  } catch (e: unknown) {
    const prep = (e as { transferPrepFail?: { ok: false; code: string; message: string } }).transferPrepFail
    if (prep) {
      return {
        success: false,
        errorCode: prep.code === "LIMIT_EXCEEDED" ? "limitexceeded" : "limitexceeded",
        message: prep.message,
      }
    }
    if (e instanceof Error && e.message === "target_session_missing") {
      return { success: false, errorCode: "invalid_session", message: "Target session not found." }
    }
    console.error("transferBookingsService transaction error", e)
    return {
      success: false,
      errorCode: "limitexceeded",
      message: "Appointment limit exceeded for target session.",
    }
  }

  // SMS: template from SmsTemplate (type 3 = Appointment Reschedule) or default; bulk send (phone comma-separated)
  const templateMessage =
    (await getSmsTemplateMessage(SMS_TEMPLATE_TYPE_TRANSFER)) ?? DEFAULT_TRANSFER_MESSAGE
  const text = templateMessage
    .replace(/{doctor}/g, doctorName)
    .replace(/{date}/g, targetDateStr)
    .replace(/{start_time}/g, targetTimeStr)
  const transferPhones = bookingObjs.map((b) => b.phone).filter(Boolean)
  if (transferPhones.length > 0) {
    await sendSms(transferPhones.join(","), text, { logName: "Transfer" })
  }

  return { success: true }
}
