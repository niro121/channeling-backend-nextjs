"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requirePermission } from "@/lib/server-permissions"
import { requestBankDepositSlipUpload } from "@/services/bank-deposit-slip.service"

export async function requestBankDepositSlipUploadAction(input: {
  contentType: string
  sizeBytes: number
}) {
  await requirePermission("ledger", "add")
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
