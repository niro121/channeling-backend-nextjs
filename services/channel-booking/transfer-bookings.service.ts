"use server"

import prisma from "@/lib/prisma"
import moment from "moment"
import { getNextSequenceNumber } from "./helpers"
import { sendSms } from "@/lib/helpers/sms/send-sms"
import { logActivity } from "@/lib/activity-log"

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

/** Receipt method 4 = DOCTOR PAYMENTS — bookings with such a receipt cannot be transferred. */
const RECEIPT_METHOD_DOCTOR_PAYMENT = 4

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

  if (!bookingIds.length) {
    return { success: false, errorCode: "invalid_input", message: "No bookings selected." }
  }
  if (!remarks.trim()) {
    return { success: false, errorCode: "invalid_input", message: "Transfer remarks are required." }
  }

  // Load target session and doctor for updates and SMS
  const [targetSession, currentSession, doctorPaymentReceipts, bookingObjs] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { doctor: { select: { id: true, title: true, name: true } } },
    }),
    prisma.session.findUnique({
      where: { id: currentSessionId },
      select: { startTime: true },
    }),
    prisma.receipt.findMany({
      where: { bookingId: { in: bookingIds }, method: RECEIPT_METHOD_DOCTOR_PAYMENT },
      select: { id: true },
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
      },
    }),
  ])

  if (!targetSession || !targetSession.doctor) {
    return { success: false, errorCode: "invalid_session", message: "Target session not found." }
  }
  if (!currentSession) {
    return { success: false, errorCode: "invalid_session", message: "Current session not found." }
  }
  if (doctorPaymentReceipts.length > 0) {
    return {
      success: false,
      errorCode: "doctor_paid",
      message: "Found already paid bookings (doctor payment). Cannot transfer.",
    }
  }
  if (bookingObjs.length !== bookingIds.length) {
    return { success: false, errorCode: "invalid_input", message: "Some bookings not found." }
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
  const doctorName = [targetSession.doctor.title, targetSession.doctor.name].filter(Boolean).join(" ")
  const targetDateStr =
    targetSession.date instanceof Date
      ? moment(targetSession.date).format("DD-MM-YYYY")
      : moment(targetSession.date).format("DD-MM-YYYY")
  const targetTimeStr =
    targetSession.startTime instanceof Date
      ? moment(targetSession.startTime).format("hh:mm A")
      : moment.unix(targetStartTime).format("hh:mm A")

  let lastAssignedAppointmentNo = 0
  for (const booking of bookingObjs) {
    const appointmentResult = await getNextSequenceNumber(`appointment:${sessionId}`, {
      startFrom: targetSession.startingPatientNumber,
      max: targetSession.maxPatientNumber,
    })
    if (!appointmentResult.success) {
      return {
        success: false,
        errorCode: "limitexceeded",
        message: "Appointment limit exceeded for target session.",
      }
    }
    const newAppointmentNo = appointmentResult.value
    lastAssignedAppointmentNo = newAppointmentNo

    const beforeDesc = `Transfer of Appointment No.${String(booking.appointmentNo).padStart(2, "0")} of ${moment.unix(booking.sessionStartTime).format("DD-MM-YYYY hh:mm A")}`

    await prisma.booking.update({
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

    const updated = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { appointmentNo: true, sessionStartTime: true },
    })
    const afterDesc = updated
      ? `Changed to Appointment No.${String(updated.appointmentNo).padStart(2, "0")} of ${moment.unix(updated.sessionStartTime).format("DD-MM-YYYY hh:mm A")}`
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
      await logActivity({
        userId,
        action: "booking.transferred",
        entityType: "Booking",
        entityId: booking.id,
        metadata: transferMetadata,
      })
      // Log to outgoing session so History for this session shows "booking left"
      await logActivity({
        userId,
        action: "booking.transferred",
        entityType: "Session",
        entityId: currentSessionId,
        metadata: { ...transferMetadata, direction: "outgoing" },
      })
      // Log to incoming session so History for target session shows "booking arrived"
      await logActivity({
        userId,
        action: "booking.transferred",
        entityType: "Session",
        entityId: sessionId,
        metadata: { ...transferMetadata, direction: "incoming" },
      })
    }
  }

  // Keep target session's appointmentNo in sync with last assigned number
  if (lastAssignedAppointmentNo > 0) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { appointmentNo: lastAssignedAppointmentNo },
    })
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
