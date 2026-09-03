"use server"

import { requirePermission } from "@/lib/server-permissions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  cancelLedgerReceiptService,
  type CancelLedgerReceiptResult,
} from "@/services/ledger/cancel-ledger-receipt.service"

export async function cancelLedgerReceiptAction(
  receiptId: string,
  cancelReason: string
): Promise<CancelLedgerReceiptResult> {
  try {
    await requirePermission("ledger", "cancel")
  } catch {
    return {
      success: false,
      errorCode: "FORBIDDEN",
      message: "You don't have permission to cancel ledger entries.",
    }
  }

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
