"use server"

import { checkPermission } from "@/lib/server-permissions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { RECEIPT_METHOD } from "@/types/receipt"
import prisma from "@/lib/prisma"
import {
  cancelLedgerReceiptService,
  type CancelLedgerReceiptResult,
} from "@/services/ledger/cancel-ledger-receipt.service"

export async function cancelLedgerReceiptAction(
  receiptId: string,
  cancelReason: string
): Promise<CancelLedgerReceiptResult> {
  const canCancel = await checkPermission("ledger", "cancel")
  const canCancelBankDeposit = await checkPermission("ledger", "cancel-bank-deposit")
  if (!canCancel && !canCancelBankDeposit) {
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

  const original = await prisma.receipt.findUnique({
    where: { id: receiptId },
    select: { method: true, receiptNoString: true },
  })
  if (!original) {
    return { success: false, errorCode: "NOT_FOUND", message: "Receipt not found." }
  }

  const isBankDeposit = original.method === RECEIPT_METHOD.BANK_DEPOSIT
  if (isBankDeposit && !canCancelBankDeposit) {
    return {
      success: false,
      errorCode: "FORBIDDEN",
      message: "You don't have permission to cancel bank deposits.",
    }
  }
  if (!isBankDeposit && !canCancel) {
    return {
      success: false,
      errorCode: "FORBIDDEN",
      message: "You don't have permission to cancel ledger entries.",
    }
  }

  const result = await cancelLedgerReceiptService({
    receiptId,
    canceledBy: userId,
    cancelReason: cancelReason.trim(),
    allowLedgerCancel: canCancel,
    allowBankDepositCancel: canCancelBankDeposit,
  })

  if (result.success && isBankDeposit) {
    logActivityNonBlocking({
      userId,
      action: "ledger.deposit.canceled",
      entityType: "LedgerReceipt",
      entityId: receiptId,
      importance: "high",
      metadata: {
        receiptNo: original.receiptNoString,
        reverseReceiptId: result.reverseReceiptId,
        reverseReceiptNo: result.reverseReceiptNoString,
      },
    })
  }

  return result
}
