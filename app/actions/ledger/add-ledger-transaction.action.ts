"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"
import { logActivity } from "@/lib/activity-log"
import { createLedgerReceipt } from "@/services/ledger/create-ledger-receipt.service"
import {
  type LedgerTransactionType,
  LEDGER_TRANSACTION_TYPES,
} from "@/services/ledger/create-ledger-receipt.service"
import { RECEIPT_PAYMENT_METHOD } from "@/types/receipt"
import { z } from "zod"

const AGENCY_TYPES = [
  "AGENCY_DEBIT_NOTE",
  "AGENCY_CREDIT_NOTE",
  "AGENCY_DEPOSIT",
  "AGENCY_WITHDRAW",
] as const

const addLedgerTransactionSchema = z.object({
  transactionType: z.enum(LEDGER_TRANSACTION_TYPES as unknown as [string, ...string[]]),
  branchId: z.string().min(1, "Branch is required"),
  agencyId: z.string().optional().nullable(),
  amount: z.number().positive("Amount must be positive"),
  remarks: z.string().min(1, "Remarks are required").trim(),
  paymentMethod: z.number().optional().nullable(),
  bank: z.string().optional(),
  bankId: z.string().optional().nullable(),
  cardReference: z.string().optional(),
  slipReference: z.string().optional(),
})

export type AddLedgerTransactionResult =
  | { success: true; receiptId: string; receiptNoString: string }
  | { success: false; message: string; errorCode?: string; issues?: Record<string, string[]> }

export async function addLedgerTransaction(
  data: z.infer<typeof addLedgerTransactionSchema>
): Promise<AddLedgerTransactionResult> {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? null
  if (!userId) {
    return { success: false, message: "You must be signed in to add a ledger transaction.", errorCode: "UNAUTHORIZED" }
  }

  await requirePermission("ledger", "add")

  const parsed = addLedgerTransactionSchema.safeParse(data)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const fieldErrors = (flat.fieldErrors ?? {}) as Record<string, string[]>
    const msg = Object.values(fieldErrors).flat().filter(Boolean)[0] ?? "Invalid input"
    return { success: false, message: msg, errorCode: "VALIDATION", issues: fieldErrors }
  }

  const { transactionType, branchId: clientBranchId, agencyId, amount, remarks } = parsed.data
  const isAgencyType = (AGENCY_TYPES as readonly string[]).includes(transactionType)

  // For agency types, branch is the user's location (not from form); use DB to avoid trusting client.
  let branchId = clientBranchId
  if (isAgencyType) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userLocationId: true },
    })
    const userLocationId = user?.userLocationId ?? null
    if (!userLocationId?.trim()) {
      return { success: false, message: "You must have a branch assigned to record agency transactions.", errorCode: "VALIDATION" }
    }
    branchId = userLocationId
  }

  if (isAgencyType && !agencyId?.trim()) {
    return { success: false, message: "Agency is required for this transaction type.", errorCode: "VALIDATION" }
  }

  if (transactionType === "AGENCY_DEPOSIT") {
    const pm = parsed.data.paymentMethod ?? RECEIPT_PAYMENT_METHOD.CASH
    if (pm !== RECEIPT_PAYMENT_METHOD.CASH && pm !== RECEIPT_PAYMENT_METHOD.CREDIT_CARD && pm !== RECEIPT_PAYMENT_METHOD.SLIP) {
      return { success: false, message: "Payment method must be Cash, Credit Card, or Slip.", errorCode: "VALIDATION" }
    }
    if ((pm === RECEIPT_PAYMENT_METHOD.CREDIT_CARD || pm === RECEIPT_PAYMENT_METHOD.SLIP) && (!parsed.data.bankId || !parsed.data.bank?.trim())) {
      return { success: false, message: "Bank is required for Card or Slip.", errorCode: "VALIDATION" }
    }
  }

  try {
    const result = await createLedgerReceipt({
      transactionType: transactionType as LedgerTransactionType,
      branchId,
      agencyId: agencyId ?? null,
      amount,
      remarks,
      createdBy: userId,
      paymentMethod: parsed.data.paymentMethod ?? undefined,
      bank: parsed.data.bank,
      bankId: parsed.data.bankId ?? undefined,
      cardReference: parsed.data.cardReference,
      slipReference: parsed.data.slipReference,
    })

    if (!result.success) {
      return { success: false, message: result.message, errorCode: result.errorCode }
    }
    await logActivity({
      userId,
      action: "ledger.receipt.created",
      entityType: "LedgerReceipt",
      entityId: result.receiptId,
      importance: "high",
      metadata: { receiptNo: result.receiptNoString, transactionType },
    })
    return {
      success: true,
      receiptId: result.receiptId,
      receiptNoString: result.receiptNoString,
    }
  } catch (err) {
    console.error("addLedgerTransaction error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create ledger transaction",
      errorCode: "SERVER_ERROR",
    }
  }
}
