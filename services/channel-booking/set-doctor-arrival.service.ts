"use server"

import prisma from "@/lib/prisma"
import moment from "moment"
import { sendSms } from "@/lib/helpers/sms/send-sms"

export type SetDoctorArrivalInput = {
  sessionId: string
  /** 1 = arrival, 0 = departure */
  arrivalStatus: number
  roomId?: string | null
}

export type ArrivalDepartureEntry = {
  time: string
  createdBy: string
}

export type SetDoctorArrivalResult =
  | { success: true; session: { doctorArrivalTime: ArrivalDepartureEntry[]; doctorDepatureTime: ArrivalDepartureEntry[]; roomId: string | null } }
  | { success: false; errorCode: string; message: string }

function parseArrivalDepartureJson(json: unknown): ArrivalDepartureEntry[] {
  if (!Array.isArray(json)) return []
  return json.filter(
    (item): item is ArrivalDepartureEntry =>
      item != null &&
      typeof item === "object" &&
      "time" in item &&
      "createdBy" in item &&
      typeof (item as ArrivalDepartureEntry).time === "string" &&
      typeof (item as ArrivalDepartureEntry).createdBy === "string"
  )
}

const SMS_TEMPLATE_TYPE_ARRIVAL = 0
const SMS_TEMPLATE_TYPE_DEPARTURE = 1
const DEFAULT_ARRIVAL_MESSAGE =
  "Dr {doctor} has arrived at the hospital. Room: {room_no}. Please proceed to the channeling counter."
const DEFAULT_DEPARTURE_MESSAGE =
  "Dr {doctor} has left. Next session starts at {start_time}."

/** Load active SMS template message by type (0 = arrival, 1 = departure). Returns null if none found. */
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
 * Set doctor arrival or departure for a session.
 * Updates linked sessions (same doctor, same day, chained by previousDoctorSession) with the same arrival/departure times and room.
 * Sends SMS to bookings (status 0 or 1) using the active SMS Template (type 0 = arrival, type 1 = departure) or a default message.
 */
export async function setDoctorArrivalService(
  input: SetDoctorArrivalInput,
  userId: string
): Promise<SetDoctorArrivalResult> {
  const { sessionId, arrivalStatus, roomId } = input

  if (!sessionId) {
    return { success: false, errorCode: "invalid_input", message: "Session ID is required." }
  }
  if (arrivalStatus !== 0 && arrivalStatus !== 1) {
    return { success: false, errorCode: "invalid_input", message: "arrivalStatus must be 1 (arrival) or 0 (departure)." }
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      doctor: { select: { id: true, title: true, name: true } },
      room: { select: { id: true, number: true } },
    },
  })
  const sessionWithChain = session
    ? {
        ...session,
        doctorSessionId: (session as { doctorSessionId: string }).doctorSessionId,
        previousDoctorSession: (session as { previousDoctorSession: string | null }).previousDoctorSession,
      }
    : null

  if (!session) {
    return { success: false, errorCode: "not_found", message: "Session not found." }
  }
  if (!session.doctorId) {
    return { success: false, errorCode: "invalid_session", message: "Session has no doctor." }
  }

  const dateString = moment().format("YYYY-MM-DD")
  const sessionDate = session.date instanceof Date ? session.date : new Date(session.date)
  const isToday = moment(sessionDate).format("YYYY-MM-DD") === dateString
  if (!isToday) {
    return { success: false, errorCode: "invalid_date", message: "Arrival/departure can only be set for today's sessions." }
  }

  const timeString = moment().format("X") // Unix seconds
  const obj: ArrivalDepartureEntry = { time: timeString, createdBy: userId }

  const dayStart = moment(sessionDate).startOf("day").toDate()
  const dayEnd = moment(sessionDate).endOf("day").add(1, "second").toDate()
  const sessionsSameDay = await prisma.session.findMany({
    where: {
      doctorId: session.doctorId,
      date: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true, doctorSessionId: true, previousDoctorSession: true },
  })

  const bookingsForSms = await prisma.booking.findMany({
    where: { sessionId, status: { in: [0, 1] } },
    orderBy: { appointmentNo: "desc" },
    select: { phone: true },
  })
  const phoneNumbers = bookingsForSms.map((b) => b.phone).filter(Boolean)

  const doctorName = [session.doctor?.title, session.doctor?.name].filter(Boolean).join(" ").trim() || "Doctor"

  if (arrivalStatus === 1) {
    // Arrival
    if (!roomId?.trim()) {
      return { success: false, errorCode: "invalid_input", message: "Room is required for doctor arrival." }
    }
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { number: true },
    })
    const roomNumber = room?.number ?? roomId

    const doctorArrivalTime = parseArrivalDepartureJson(session.doctorArrivalTime)
    doctorArrivalTime.push(obj)

    const updatePayload = {
      doctorArrivalTime: doctorArrivalTime as unknown as object,
      roomId: roomId.trim(),
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: updatePayload,
    })

    type ChainSession = { id: string; doctorSessionId: string; previousDoctorSession: string | null }
    const chainStart: ChainSession = {
      id: session.id,
      doctorSessionId: (session as { doctorSessionId: string }).doctorSessionId,
      previousDoctorSession: (session as { previousDoctorSession: string | null }).previousDoctorSession,
    }
    let pSession: ChainSession = chainStart
    let nSession: ChainSession = chainStart

    for (let i = 0; i < sessionsSameDay.length; i++) {
      let parentSession: (typeof sessionsSameDay)[0] | undefined
      let nextSession: (typeof sessionsSameDay)[0] | undefined

      parentSession = sessionsSameDay.find((s) => s.doctorSessionId === pSession.previousDoctorSession)
      if (parentSession) {
        pSession = parentSession
        await prisma.session.update({
          where: { id: parentSession.id },
          data: updatePayload,
        })
      }

      nextSession = sessionsSameDay.find((s) => s.previousDoctorSession === nSession.doctorSessionId)
      if (nextSession) {
        nSession = nextSession
        await prisma.session.update({
          where: { id: nextSession.id },
          data: updatePayload,
        })
      }

      if (!parentSession && !nextSession) break
    }

    // SMS: arrival template from SmsTemplate (type 0) or default; placeholders: {doctor}, {room_no}
    const arrivalTemplate =
      (await getSmsTemplateMessage(SMS_TEMPLATE_TYPE_ARRIVAL)) ?? DEFAULT_ARRIVAL_MESSAGE
    const arrivalMessage = arrivalTemplate
      .replace(/{doctor}/g, doctorName)
      .replace(/{room_no}/g, roomNumber)
    if (phoneNumbers.length > 0) {
      await sendSms(phoneNumbers.join(","), arrivalMessage, { logName: "Doctor Arrival" })
    }
  } else {
    // Departure
    const doctorDepatureTime = parseArrivalDepartureJson(session.doctorDepatureTime)
    doctorDepatureTime.push(obj)

    const updatePayload = {
      doctorDepatureTime: doctorDepatureTime as unknown as object,
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: updatePayload,
    })

    type ChainSession = { id: string; doctorSessionId: string; previousDoctorSession: string | null }
    const chainStart: ChainSession = {
      id: session.id,
      doctorSessionId: sessionWithChain!.doctorSessionId,
      previousDoctorSession: sessionWithChain!.previousDoctorSession,
    }
    let pSession: ChainSession = chainStart
    let nSession: ChainSession = chainStart

    for (let i = 0; i < sessionsSameDay.length; i++) {
      let parentSession: (typeof sessionsSameDay)[0] | undefined
      let nextSession: (typeof sessionsSameDay)[0] | undefined

      parentSession = sessionsSameDay.find((s) => s.doctorSessionId === pSession.previousDoctorSession)
      if (parentSession) {
        pSession = parentSession
        await prisma.session.update({
          where: { id: parentSession.id },
          data: updatePayload,
        })
      }

      nextSession = sessionsSameDay.find((s) => s.previousDoctorSession === nSession.doctorSessionId)
      if (nextSession) {
        nSession = nextSession
        await prisma.session.update({
          where: { id: nextSession.id },
          data: updatePayload,
        })
      }

      if (!parentSession && !nextSession) break
    }

    // SMS: departure template from SmsTemplate (type 1) or default; placeholders: {doctor}, {start_time}
    const startTimeFormatted = moment(session.startTime).format("LT")
    const departureTemplate =
      (await getSmsTemplateMessage(SMS_TEMPLATE_TYPE_DEPARTURE)) ?? DEFAULT_DEPARTURE_MESSAGE
    const departureMessage = departureTemplate
      .replace(/{doctor}/g, doctorName)
      .replace(/{start_time}/g, startTimeFormatted)
    if (phoneNumbers.length > 0) {
      await sendSms(phoneNumbers.join(","), departureMessage, { logName: "Doctor Departure" })
    }
  }

  const updated = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      doctorArrivalTime: true,
      doctorDepatureTime: true,
      roomId: true,
    },
  })

  const doctorArrivalTime = parseArrivalDepartureJson(updated?.doctorArrivalTime ?? [])
  const doctorDepatureTime = parseArrivalDepartureJson(updated?.doctorDepatureTime ?? [])

  return {
    success: true,
    session: {
      doctorArrivalTime,
      doctorDepatureTime,
      roomId: updated?.roomId ?? null,
    },
  }
}
