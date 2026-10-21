import prisma from "@/lib/prisma"
import moment from "moment"
import { sendSms, type SendSmsResult } from "./send-sms"

const COLOMBO_OFFSET_MINUTES = 330

function pad(num: number, size: number): string {
  return num.toString().padStart(size, "0")
}

/**
 * Patient channel-details SMS. Same message as the Sails `sendsms` helper:
 * ref, appointment no, doctor, branch, session date and time.
 */
export async function sendBookingSms(bookingId: string): Promise<SendSmsResult> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: true,
        doctor: true,
        location: true,
      },
    })

    if (!booking) {
      return { status: false, error: "Booking not found", description: "" }
    }

    const phone = booking.phone?.trim()
    if (!phone) {
      return { status: false, error: "Booking has no phone", description: "" }
    }

    const session = booking.session
    const doctor = booking.doctor
    if (!session || !doctor) {
      return { status: false, error: "Booking session or doctor missing", description: "" }
    }

    const refNo =
      booking.receiptNoString?.trim() || booking.bookingid_string?.trim() || booking.id
    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date)
    const startTime =
      session.startTime instanceof Date ? session.startTime : new Date(session.startTime)
    const dateStr = moment(sessionDate).utcOffset(COLOMBO_OFFSET_MINUTES).format("YYYY-MM-DD")
    const timeStr = moment(startTime).utcOffset(COLOMBO_OFFSET_MINUTES).format("h:mm A")
    const doctorName = [doctor.title, doctor.name].filter(Boolean).join(" ")
    const branch =
      booking.location != null
        ? `${booking.location.name}, ${booking.location.city}`
        : ""

    const text = [
      "Channel Details ::",
      `Ref No: ${refNo}`,
      `App No: ${pad(booking.appointmentNo, 2)}`,
      `Doctor: ${doctorName}`,
      `Branch: ${branch}`,
      `Session: ${dateStr} ${timeStr}`,
    ].join("\n")

    return sendSms(phone, text, { logName: "Booking" })
  } catch (e) {
    console.error("sendBookingSms error", e)
    return {
      status: false,
      error: "SMS EXCEPTION",
      description: e instanceof Error ? e.message : String(e),
    }
  }
}
