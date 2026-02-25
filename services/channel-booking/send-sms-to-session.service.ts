"use server"

import prisma from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { sendSms } from "@/lib/helpers/sms/send-sms"

export type SendSmsToSessionInput = {
  sessionId: string
  message: string
  userId?: string | null
}

export type SendSmsToSessionResult =
  | { success: true; recipientCount: number }
  | { success: false; errorCode: string; message: string }

/**
 * Send the same SMS to all bookings in a session except refunded (status === 2).
 * Uses the same sendSms helper as transfer and other features.
 */
export async function sendSmsToSessionService(
  input: SendSmsToSessionInput
): Promise<SendSmsToSessionResult> {
  const { sessionId, message, userId } = input

  if (!message.trim()) {
    return {
      success: false,
      errorCode: "invalid_input",
      message: "Message is required.",
    }
  }

  const bookings = await prisma.booking.findMany({
    where: {
      sessionId,
      status: { not: 2 },
    },
    select: { phone: true },
  })

  const phones = bookings
    .map((b) => b.phone?.trim())
    .filter((p): p is string => !!p)

  if (phones.length === 0) {
    return {
      success: false,
      errorCode: "no_recipients",
      message: "No bookings with phone numbers in this session (refunded bookings are excluded).",
    }
  }

  const result = await sendSms(phones.join(","), message.trim(), {
    logName: "Session SMS",
  })

  if (!result.status) {
    return {
      success: false,
      errorCode: "sms_failed",
      message: result.error ?? result.description ?? "SMS send failed.",
    }
  }

  if (userId) {
    await logActivity({
      userId,
      action: "session.sms_sent",
      entityType: "Session",
      entityId: sessionId,
      metadata: { recipientCount: phones.length },
    })
  }

  return { success: true, recipientCount: phones.length }
}
