"use server"

import { requirePermission } from "@/lib/server-permissions"
import {
  printLedgerReceiptService,
  type PrintLedgerReceiptData,
} from "@/services/ledger/print-ledger-receipt.service"

export type PrintLedgerReceiptResult = {
  success: boolean
  data?: PrintLedgerReceiptData
  message?: string
}

export async function printLedgerReceiptAction(
  receiptId: string
): Promise<PrintLedgerReceiptResult> {
  await requirePermission("ledger", "view")
  if (!receiptId?.trim()) {
    return { success: false, message: "Receipt is required." }
  }
  return printLedgerReceiptService(receiptId.trim())
}
