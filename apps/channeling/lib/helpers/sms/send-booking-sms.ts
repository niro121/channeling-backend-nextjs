/* import prisma from "@/lib/prisma"
import { normalizeSessionTime } from "@/lib/utils"
import { sendSms, type SendSmsResult } from "./send-sms"

function pad(num: number, size: number): string {
  return num.toString().padStart(size, "0")
}

function formatSessionDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatSessionTime(startTime: Date | number, sessionDate: Date): string {
  const d = normalizeSessionTime(
    startTime instanceof Date ? startTime : new Date(startTime),
    sessionDate
  )
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h < 12 ? "AM" : "PM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}


 * Send channel-details SMS for a booking using the reusable sendSms helper.
 * Builds the message from booking data, then calls sendSms(phone, text).
 
export async function sendBookingSms(bookingId: string): Promise<SendSmsResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      session: true,
      doctor: true,
      location: true,
    },
  })

  if (!booking) {
    return {
      status: false,
      error: "Booking not found",
      description: "",
    }
  }

  const refNo = booking.receiptNoString ?? booking.id
  const sessionDate =
    booking.session.date instanceof Date
      ? booking.session.date
      : new Date(booking.session.date)
  const timeStr = formatSessionTime(booking.session.startTime, sessionDate)
  const dateStr = formatSessionDate(sessionDate)
  const doctorName = `${booking.doctor.title} ${booking.doctor.name}`.trim()
  const branch =
    booking.location != null
      ? `${booking.location.name}, ${booking.location.city}`
      : "—"

  const text = [
    "Channel Details ::",
    `Ref No: ${refNo}`,
    `App No: ${pad(booking.appointmentNo, 2)}`,
    `Doctor: ${doctorName}`,
    `Branch: ${branch}`,
    `Session: ${dateStr} ${timeStr}`,
  ].join("\n")

  return sendSms(booking.phone, text, { logName: "Booking" })
}
 */