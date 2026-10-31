"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertCanAddLedgerTransactionType } from "@/lib/server-permissions"
import { requestBankDepositSlipUpload } from "@/services/bank-deposit-slip.service"
import { listShiftBillAttachmentsForShift } from "@/services/shift-bill-attachment.service"

export async function requestBankDepositSlipUploadAction(input: {
  contentType: string
  sizeBytes: number
}) {
  const canDeposit = await assertCanAddLedgerTransactionType("BANK_DEPOSIT")
  if (!canDeposit) {
    return { success: false as const, error: "You don't have permission to record a bank deposit." }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false as const, error: "You must be signed in." }
  }
  return requestBankDepositSlipUpload({
    userId: session.user.id,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  })
}

export async function listShiftBillsForBankDepositAction() {
  const canDeposit = await assertCanAddLedgerTransactionType("BANK_DEPOSIT")
  if (!canDeposit) {
    return { success: false as const, error: "You don't have permission to record a bank deposit." }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false as const, error: "You must be signed in." }
  }
  return listShiftBillAttachmentsForShift({ userId: session.user.id })
}
