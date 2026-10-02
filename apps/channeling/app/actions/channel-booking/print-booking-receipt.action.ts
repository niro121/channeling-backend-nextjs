"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requirePermission } from "@/lib/server-permissions"
import {
  printBookingReceiptService,
  type PrintBookingReceiptData,
} from "@/services/channel-booking/print-booking-receipt.service"

export type PrintBookingReceiptResult = {
  success: boolean
  data?: PrintBookingReceiptData
  message?: string
}

export async function printBookingReceiptAction(
  receiptId: string
): Promise<PrintBookingReceiptResult> {
  await requirePermission("channel-booking", "view")
  if (!receiptId?.trim()) {
    return { success: false, message: "Receipt is required." }
  }
  const session = await getServerSession(authOptions)
  return printBookingReceiptService(receiptId.trim(), session?.user?.id ?? null)
}
