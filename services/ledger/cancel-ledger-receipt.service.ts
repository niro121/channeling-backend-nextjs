import type { PrismaClient } from "@prisma/client"
import prisma from "@/lib/prisma"
import { RECEIPT_METHOD } from "@/types/receipt"
import {
  createReceiptWithoutBooking,
  type CreateReceiptWithoutBookingParams,
} from "@/services/channel-booking/helpers/create-receipt-for-booking"
import {
  buildReceiptJournalEntryInput,
  requireReceiptJournalAccounts,
  resolveReceiptJournalAccounts,
} from "@/services/channel-booking/helpers/receipt-journal-entry"
import { getNextSequenceNumber } from "@/services/channel-booking/helpers/sequence"
import {
  createJournalEntryInTransaction,
  type AccountingTx,
} from "@/services/accounting.service"
import { requireActiveShift, getCurrentShift } from "@/services/shift.service"
import { updateAgentBalance } from "@/services/channel-booking/helpers/update-agent-balance"

const JOURNAL_SEQUENCE_SCOPE = "journal"

const LEDGER_METHODS = [
  RECEIPT_METHOD.DEBIT_NOTE,
  RECEIPT_METHOD.CREDIT_NOTE,
  RECEIPT_METHOD.AGENCY_DEPOSIT,
  RECEIPT_METHOD.AGENCY_WITHDRAW,
  RECEIPT_METHOD.BRANCH_INCOME,
  RECEIPT_METHOD.BRANCH_EXPENSE,
  RECEIPT_METHOD.BANK_DEPOSIT,
  RECEIPT_METHOD.BANK_WITHDRAW,
] as const

/** Map ledger receipt method to its reverse (for cancel). */
function getReverseMethod(method: number): number {
  switch (method) {
    case RECEIPT_METHOD.BRANCH_INCOME:
      return RECEIPT_METHOD.BRANCH_EXPENSE
    case RECEIPT_METHOD.BRANCH_EXPENSE:
      return RECEIPT_METHOD.BRANCH_INCOME
    case RECEIPT_METHOD.DEBIT_NOTE:
      return RECEIPT_METHOD.CREDIT_NOTE
    case RECEIPT_METHOD.CREDIT_NOTE:
      return RECEIPT_METHOD.DEBIT_NOTE
    case RECEIPT_METHOD.AGENCY_DEPOSIT:
      return RECEIPT_METHOD.AGENCY_WITHDRAW
    case RECEIPT_METHOD.AGENCY_WITHDRAW:
      return RECEIPT_METHOD.AGENCY_DEPOSIT
    case RECEIPT_METHOD.BANK_DEPOSIT:
      return RECEIPT_METHOD.BANK_WITHDRAW
    case RECEIPT_METHOD.BANK_WITHDRAW:
      return RECEIPT_METHOD.BANK_DEPOSIT
    default:
      throw new Error(`Cannot cancel: method ${method} is not a ledger type`)
  }
}

export type CancelLedgerReceiptInput = {
  receiptId: string
  canceledBy: string
  cancelReason: string
}

export type CancelLedgerReceiptResult =
  | { success: true; reverseReceiptId: string; reverseReceiptNoString: string }
  | { success: false; errorCode: string; message: string }

export async function cancelLedgerReceiptService(
  input: CancelLedgerReceiptInput
): Promise<CancelLedgerReceiptResult> {
  if (input.canceledBy) await requireActiveShift(input.canceledBy)

  const currentShift = input.canceledBy ? await getCurrentShift(input.canceledBy) : null
  const shiftId = currentShift?.id ?? undefined

  const reason = input.cancelReason?.trim() ?? ""
  if (!reason) {
    return { success: false, errorCode: "VALIDATION", message: "Cancel reason is required." }
  }

  const original = await prisma.receipt.findUnique({
    where: { id: input.receiptId },
    include: {
      location: { select: { id: true } },
      userLocation: { select: { id: true } },
      agency: { select: { id: true } },
    },
  })

  if (!original) {
    return { success: false, errorCode: "NOT_FOUND", message: "Receipt not found." }
  }
  if (original.bookingId != null) {
    return { success: false, errorCode: "INVALID", message: "Only ledger receipts can be canceled." }
  }
  if (!LEDGER_METHODS.includes(original.method as (typeof LEDGER_METHODS)[number])) {
    return { success: false, errorCode: "INVALID", message: "This receipt type cannot be canceled." }
  }
  if (original.canceledAt != null || original.reverseReceiptId != null) {
    return { success: false, errorCode: "ALREADY_CANCELED", message: "This entry is already canceled." }
  }
  if (original.reversedReceiptId != null) {
    return {
      success: false,
      errorCode: "INVALID",
      message: "Reversal entries cannot be canceled.",
    }
  }

  const reverseMethod = getReverseMethod(original.method)
  const reverseAmount = -original.amount
  const reverseType = original.type === 0 ? 1 : 0
  const branchId = original.locationId ?? original.userLocationId
  if (!branchId) {
    return { success: false, errorCode: "INVALID", message: "Receipt has no branch." }
  }

  const needCashierAccount =
    reverseMethod === RECEIPT_METHOD.BRANCH_INCOME ||
    reverseMethod === RECEIPT_METHOD.BRANCH_EXPENSE ||
    reverseMethod === RECEIPT_METHOD.AGENCY_DEPOSIT ||
    reverseMethod === RECEIPT_METHOD.AGENCY_WITHDRAW
  const isAgency =
    reverseMethod === RECEIPT_METHOD.DEBIT_NOTE ||
    reverseMethod === RECEIPT_METHOD.CREDIT_NOTE ||
    reverseMethod === RECEIPT_METHOD.AGENCY_DEPOSIT ||
    reverseMethod === RECEIPT_METHOD.AGENCY_WITHDRAW

  let accounts = await resolveReceiptJournalAccounts({
    locationId: branchId,
    createdBy: input.canceledBy,
    agencyId: original.agencyId ?? null,
    needTill: needCashierAccount,
    bankAccountId:
      reverseMethod === RECEIPT_METHOD.BANK_DEPOSIT || reverseMethod === RECEIPT_METHOD.BANK_WITHDRAW
        ? (original.bankId ?? null)
        : null,
  })
  if (!accounts) {
    return {
      success: false,
      errorCode: "CASH_BOOK_NOT_FOUND",
      message: "Branch cash book not found. Cannot create reversal.",
    }
  }
  const reqResult = await requireReceiptJournalAccounts(
    {
      locationId: branchId,
      createdBy: input.canceledBy,
      agencyId: original.agencyId ?? null,
      needTill: needCashierAccount,
      bankAccountId:
        reverseMethod === RECEIPT_METHOD.BANK_DEPOSIT || reverseMethod === RECEIPT_METHOD.BANK_WITHDRAW
          ? (original.bankId ?? null)
          : null,
    },
    { needTill: needCashierAccount, isAgent: isAgency }
  )
  if (!reqResult.success) {
    return { success: false, errorCode: reqResult.errorCode ?? "ACCOUNTS", message: reqResult.error ?? "Failed to resolve accounts." }
  }
  accounts = reqResult.accounts

  const journalNumberResult = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 })
  const journalNumber = journalNumberResult.success ? journalNumberResult.value : 0

  const reversalRemarks = `Reversal of ${original.receiptNoString}. Reason: ${reason}`

  const reverseParams: CreateReceiptWithoutBookingParams = {
    paymentMethod: original.paymentMethod,
    amount: reverseAmount,
    bank: original.bank ?? "",
    bankId: original.bankId ?? null,
    cardReference: original.cardReference ?? "",
    slipReference: original.slipReference ?? "",
    remarks: reversalRemarks,
    type: reverseType,
    method: reverseMethod,
    agencyId: original.agencyId ?? null,
    createdBy: input.canceledBy,
    locationId: branchId,
    userLocationId: isAgency ? branchId : undefined,
    shiftId: shiftId ?? undefined,
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const r = await createReceiptWithoutBooking(tx as Pick<PrismaClient, "receipt">, reverseParams)
      if (!r.success) return r

      await tx.receipt.update({
        where: { id: r.receipt.id },
        data: { reversedReceiptId: input.receiptId },
      })

      const journalInput = buildReceiptJournalEntryInput(r.receipt, accounts!)
      if (journalInput && journalNumber > 0) {
        const jResult = await createJournalEntryInTransaction(tx as unknown as AccountingTx, journalInput, journalNumber)
        if (!jResult.success) throw new Error(jResult.error ?? "Journal entry failed")
      }

      await tx.receipt.update({
        where: { id: input.receiptId },
        data: {
          canceledAt: new Date(),
          canceledBy: input.canceledBy,
          cancelReason: reason,
          reverseReceiptId: r.receipt.id,
        },
      })

      return { success: true as const, receipt: r.receipt }
    },
    { timeout: 15000 }
  )

  if (!result.success) {
    const failed = result as { success: false; errorCode?: string; message?: string };
    return {
      success: false,
      errorCode: failed.errorCode ?? "SERVER",
      message: failed.message ?? "Cancel failed.",
    };
  }

  const receipt = (result as { success: true; receipt: { id: string; receiptNoString: string } }).receipt

  if (original.agencyId) {
    const amountRupees = Math.abs(original.amount)
    if (original.method === RECEIPT_METHOD.DEBIT_NOTE) {
      await updateAgentBalance(original.agencyId, -amountRupees)
    } else if (original.method === RECEIPT_METHOD.CREDIT_NOTE) {
      await updateAgentBalance(original.agencyId, amountRupees)
    } else if (original.method === RECEIPT_METHOD.AGENCY_DEPOSIT) {
      await updateAgentBalance(original.agencyId, amountRupees)
    } else if (original.method === RECEIPT_METHOD.AGENCY_WITHDRAW) {
      await updateAgentBalance(original.agencyId, -amountRupees)
    }
  }

  return {
    success: true,
    reverseReceiptId: receipt.id,
    reverseReceiptNoString: receipt.receiptNoString,
  }
}
