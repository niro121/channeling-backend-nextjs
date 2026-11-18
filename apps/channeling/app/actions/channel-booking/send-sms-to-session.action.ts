"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { sendSmsToSessionService } from "@/services/channel-booking/send-sms-to-session.service"

const sendSmsToSessionSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1, "Message is required."),
})

export type SendSmsToSessionActionInput = z.infer<typeof sendSmsToSessionSchema>

export type SendSmsToSessionActionResult =
  | { success: true; recipientCount: number }
  | { success: false; errorCode: string; message: string }

export async function sendSmsToSessionAction(
  raw: unknown
): Promise<SendSmsToSessionActionResult> {
  try {
    await requirePermission("channel-booking", "edit")
  } catch {
    return {
      success: false,
      errorCode: "forbidden",
      message: "Permission denied",
    }
  }

  const parsed = sendSmsToSessionSchema.safeParse(raw)
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors &&
      Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join("; ")
    return {
      success: false,
      errorCode: "invalid_input",
      message: msg || "Invalid input",
    }
  }

  const session = await fetchServerSession()
  const userId = session?.user?.id ?? null
  return sendSmsToSessionService({ ...parsed.data, userId })
}
