"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import { transferBookingsService } from "@/services/channel-booking/transfer-bookings.service"

const transferBookingsSchema = z
  .object({
    bookingIds: z.array(z.string().min(1)).min(1),
    doctorId: z.string().min(1),
    sessionId: z.string().min(1),
    currentSessionId: z.string().min(1),
    remarks: z.string().min(1, "Transfer remarks are required."),
  })
  .refine(
    async (data) => {
      const canceledOrRefundedCount = await prisma.booking.count({
        where: {
          id: { in: data.bookingIds },
          OR: [{ status: 2 }, { status: 3 }, { refund: { in: [1, 2, 3] } }],
        },
      })
      return canceledOrRefundedCount === 0
    },
    {
      message:
        "Canceled or refunded bookings cannot be transferred. Please remove them from the selection.",
    }
  )
  .refine(
    async (data) => {
      const session = await prisma.session.findUnique({
        where: { id: data.sessionId },
        select: { status: true },
      })
      // status 1 = ACTIVE, 0 = LEAVE — cannot transfer to a session on leave
      return session != null && session.status === 1
    },
    { message: "The selected session is on leave and cannot receive transfers. Please choose an active session." }
  )

export type TransferBookingsActionInput = z.infer<typeof transferBookingsSchema>

export type TransferBookingsActionResult =
  | { success: true }
  | { success: false; errorCode: string; message: string }

export async function transferBookingsAction(
  raw: unknown
): Promise<TransferBookingsActionResult> {
  try {
    await requirePermission("channel-booking", "edit")
  } catch {
    return {
      success: false,
      errorCode: "forbidden",
      message: "Permission denied",
    }
  }

  const session = await fetchServerSession()
  const userId = session?.user?.id ?? null

  const parsed = await transferBookingsSchema.safeParseAsync(raw)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const fieldMsg =
      parsed.error.flatten().fieldErrors &&
      Object.entries(parsed.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
        .join("; ")
    const msg = firstIssue?.message ?? (fieldMsg || "Invalid input")
    return {
      success: false,
      errorCode: "invalid_input",
      message: msg,
    }
  }

  return transferBookingsService(parsed.data, userId)
}
