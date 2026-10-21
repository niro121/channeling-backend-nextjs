"use server"

import {
  getReceiptDetailsService,
  type ReceiptDetailsView,
} from "@/services/channel-booking/get-receipt-details.service"

export type GetReceiptDetailsResult = {
  success: boolean
  data?: ReceiptDetailsView
  message?: string
}

export async function getReceiptDetails(
  receiptId: string
): Promise<GetReceiptDetailsResult> {
  return getReceiptDetailsService(receiptId)
}
