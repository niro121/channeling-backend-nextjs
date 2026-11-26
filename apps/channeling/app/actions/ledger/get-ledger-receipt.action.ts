"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getLedgerReceiptById } from "@/services/ledger/get-ledger-receipt.service"

export async function getLedgerReceipt(receiptId: string) {
  await requirePermission("ledger", "view")
  return getLedgerReceiptById(receiptId)
}
