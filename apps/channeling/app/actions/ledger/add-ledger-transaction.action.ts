"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { createLedgerReceipt } from "@/services/ledger/create-ledger-receipt.service"
import { requestBankDepositApproval } from "@/services/approval-request.service"
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
  branchId: z.string().optional().nullable(),
  agencyId: z.string().optional().nullable(),
  amount: z.number().positive("Amount must be positive"),
  remarks: z.string().min(1, "Remarks are required").trim(),
  paymentMethod: z.number().optional().nullable(),
  bank: z.string().optional(),
  bankId: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  cardReference: z.string().optional(),
  slipReference: z.string().optional(),
  slipDate: z.string().optional(),
  slipImageKey: z.string().optional().nullable(),
  slipImageContentType: z.string().optional().nullable(),
  slipImageName: z.string().optional().nullable(),
})

export type AddLedgerTransactionResult =
  | { success: true; receiptId: string; receiptNoString: string }
  | { success: true; pendingApproval: true; requestId: string }
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
  const isBankDeposit = transactionType === "BANK_DEPOSIT"
  const isBranchIncomeOrExpense =
    transactionType === "BRANCH_INCOME" || transactionType === "BRANCH_EXPENSE"
  const lockBranchToUserLocation = isAgencyType || isBankDeposit || isBranchIncomeOrExpense
  let userLocationId: string | null = null

  // Branch income/expense, agency, and bank-deposit types use the user's location (not a chosen branch).
  let branchId = clientBranchId ?? ""
  if (lockBranchToUserLocation) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userLocationId: true },
    })
    userLocationId = user?.userLocationId ?? null
    if (!userLocationId?.trim()) {
      return {
        success: false,
        message: isBankDeposit
          ? "You must have a branch assigned to record bank deposits."
          : isBranchIncomeOrExpense
            ? "You must have a branch assigned to record branch income or expense."
            : "You must have a branch assigned to record agency transactions.",
        errorCode: "VALIDATION",
      }
    }
    if (isBranchIncomeOrExpense && clientBranchId?.trim() && clientBranchId !== userLocationId) {
      return {
        success: false,
        message: "You can only record branch income or expense for your assigned branch.",
        errorCode: "VALIDATION",
      }
    }
    branchId = userLocationId
  }
  if (!lockBranchToUserLocation && !branchId.trim()) {
    return { success: false, message: "Branch is required.", errorCode: "VALIDATION" }
  }

  if (isAgencyType && !agencyId?.trim()) {
    return { success: false, message: "Agency is required for this transaction type.", errorCode: "VALIDATION" }
  }

  if (transactionType === "AGENCY_DEPOSIT") {
    const pm = parsed.data.paymentMethod ?? RECEIPT_PAYMENT_METHOD.CASH
    if (
      pm !== RECEIPT_PAYMENT_METHOD.CASH &&
      pm !== RECEIPT_PAYMENT_METHOD.CREDIT_CARD &&
      pm !== RECEIPT_PAYMENT_METHOD.SLIP &&
      pm !== RECEIPT_PAYMENT_METHOD.CHECK &&
      pm !== RECEIPT_PAYMENT_METHOD.E_WALLET
    ) {
      return {
        success: false,
        message: "Payment method must be Cash, Credit Card, Slip, Cheque, or E-Wallet.",
        errorCode: "VALIDATION",
      }
    }
    if (pm !== RECEIPT_PAYMENT_METHOD.CASH && (!parsed.data.bankId || !parsed.data.bank?.trim())) {
      return {
        success: false,
        message: "Bank is required for non-cash payment methods.",
        errorCode: "VALIDATION",
      }
    }
    if (pm === RECEIPT_PAYMENT_METHOD.SLIP && !parsed.data.slipDate?.trim()) {
      return {
        success: false,
        message: "Slip date is required for slip payments.",
        errorCode: "VALIDATION",
      }
    }
    if (pm === RECEIPT_PAYMENT_METHOD.SLIP && !parsed.data.slipReference?.trim()) {
      return {
        success: false,
        message: "Slip reference is required for slip payments.",
        errorCode: "VALIDATION",
      }
    }
    if (pm === RECEIPT_PAYMENT_METHOD.CHECK && !parsed.data.slipReference?.trim()) {
      return {
        success: false,
        message: "Cheque number is required for cheque payments.",
        errorCode: "VALIDATION",
      }
    }
    if (pm === RECEIPT_PAYMENT_METHOD.CHECK && !parsed.data.slipDate?.trim()) {
      return {
        success: false,
        message: "Cheque date is required for cheque payments.",
        errorCode: "VALIDATION",
      }
    }
    if (pm === RECEIPT_PAYMENT_METHOD.CREDIT_CARD) {
      const last4 = (parsed.data.cardReference ?? "").replace(/\D/g, "")
      if (last4.length !== 4) {
        return {
          success: false,
          message: "Enter last 4 digits of card.",
          errorCode: "VALIDATION",
          issues: { cardReference: ["Enter last 4 digits of card."] },
        }
      }
    }
    if (pm === RECEIPT_PAYMENT_METHOD.E_WALLET && !parsed.data.cardReference?.trim()) {
      return {
        success: false,
        message: "E-wallet reference is required.",
        errorCode: "VALIDATION",
        issues: { cardReference: ["Enter e-wallet reference."] },
      }
    }
  }
  if (transactionType === "BANK_DEPOSIT" && !parsed.data.bankAccountId?.trim()) {
    return { success: false, message: "Bank account is required for bank deposit.", errorCode: "VALIDATION" }
  }

  try {
    if (isBankDeposit) {
      const pending = await requestBankDepositApproval(
        {
          amount,
          remarks,
          bankAccountId: parsed.data.bankAccountId!.trim(),
          locationId: branchId,
          userLocationId,
          slipImageKey: parsed.data.slipImageKey,
          slipImageContentType: parsed.data.slipImageContentType,
          slipImageName: parsed.data.slipImageName,
        },
        userId
      )
      if (!pending.success) {
        return { success: false, message: pending.message, errorCode: pending.errorCode }
      }
      return { success: true, pendingApproval: true, requestId: pending.data?.id ?? "" }
    }

    const result = await createLedgerReceipt({
      transactionType: transactionType as LedgerTransactionType,
      branchId,
      userLocationId,
      agencyId: agencyId ?? null,
      amount,
      remarks,
      createdBy: userId,
      paymentMethod: parsed.data.paymentMethod ?? undefined,
      bank: parsed.data.bank,
      bankId: parsed.data.bankId ?? undefined,
      bankAccountId: parsed.data.bankAccountId ?? undefined,
      cardReference: parsed.data.cardReference,
      slipReference: parsed.data.slipReference,
      slipDate: parsed.data.slipDate,
    })

    if (!result.success) {
      return { success: false, message: result.message, errorCode: result.errorCode }
    }
    logActivityNonBlocking({
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
