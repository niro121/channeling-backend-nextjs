"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  cancelLedgerReceiptService,
  type CancelLedgerReceiptInput,
  type CancelLedgerReceiptResult,
} from "@/services/ledger/cancel-ledger-receipt.service"

export async function cancelLedgerReceiptAction(
  receiptId: string,
  cancelReason: string
): Promise<CancelLedgerReceiptResult> {
  await requirePermission("ledger", "add")

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? null
  if (!userId) {
    return { success: false, errorCode: "UNAUTHORIZED", message: "You must be logged in to cancel an entry." }
  }

  return cancelLedgerReceiptService({
    receiptId,
    canceledBy: userId,
    cancelReason: cancelReason.trim(),
  })
}
