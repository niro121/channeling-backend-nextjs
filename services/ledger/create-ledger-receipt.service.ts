import prisma from "@/lib/prisma"
import { createJournalEntryInTransaction } from "@/services/accounting.service"
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
import { updateAgentBalance } from "@/services/channel-booking/helpers/update-agent-balance"
import {
  RECEIPT_METHOD,
  RECEIPT_PAYMENT_METHOD,
} from "@/types/receipt"

const JOURNAL_SEQUENCE_SCOPE = "journal"

export const LEDGER_TRANSACTION_TYPES = [
  "BRANCH_INCOME",
  "BRANCH_EXPENSE",
  "AGENCY_DEBIT_NOTE",
  "AGENCY_CREDIT_NOTE",
  "AGENCY_DEPOSIT",
  "AGENCY_WITHDRAW",
] as const

export type LedgerTransactionType = (typeof LEDGER_TRANSACTION_TYPES)[number]

const AGENCY_TYPES: LedgerTransactionType[] = [
  "AGENCY_DEBIT_NOTE",
  "AGENCY_CREDIT_NOTE",
  "AGENCY_DEPOSIT",
  "AGENCY_WITHDRAW",
]

function isAgencyType(
  type: LedgerTransactionType
): type is (typeof AGENCY_TYPES)[number] {
  return AGENCY_TYPES.includes(type)
}

export type CreateLedgerReceiptInput = {
  transactionType: LedgerTransactionType
  branchId: string
  agencyId?: string | null
  amount: number
  remarks?: string
  createdBy: string | null
  /** For AGENCY_DEPOSIT only: 0 Cash, 1 Credit Card, 2 Slip */
  paymentMethod?: number
  bank?: string
  bankId?: string | null
  cardReference?: string
  slipReference?: string
}

export type CreateLedgerReceiptResult =
  | { success: true; receiptId: string; receiptNoString: string }
  | { success: false; errorCode: string; message: string }

function mapToReceiptMethodAndType(
  transactionType: LedgerTransactionType
): { method: number; type: number; paymentMethod: number } {
  switch (transactionType) {
    case "BRANCH_INCOME":
      return { method: RECEIPT_METHOD.BRANCH_INCOME, type: 1, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH }
    case "BRANCH_EXPENSE":
      return { method: RECEIPT_METHOD.BRANCH_EXPENSE, type: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH }
    case "AGENCY_DEBIT_NOTE":
      return { method: RECEIPT_METHOD.DEBIT_NOTE, type: 1, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH }
    case "AGENCY_CREDIT_NOTE":
      return { method: RECEIPT_METHOD.CREDIT_NOTE, type: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH }
    case "AGENCY_DEPOSIT":
      return {
        method: RECEIPT_METHOD.AGENCY_DEPOSIT,
        type: 1,
        paymentMethod: RECEIPT_PAYMENT_METHOD.CASH, // default; overridden by input.paymentMethod
      }
    case "AGENCY_WITHDRAW":
      return { method: RECEIPT_METHOD.AGENCY_WITHDRAW, type: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH }
    default:
      throw new Error(`Unknown transaction type: ${transactionType}`)
  }
}

export async function createLedgerReceipt(
  input: CreateLedgerReceiptInput
): Promise<CreateLedgerReceiptResult> {
  if (!input.branchId?.trim()) {
    return { success: false, errorCode: "VALIDATION", message: "Branch is required." }
  }
  if (typeof input.amount !== "number" || input.amount <= 0) {
    return { success: false, errorCode: "VALIDATION", message: "Amount must be a positive number." }
  }
  if (isAgencyType(input.transactionType) && !input.agencyId?.trim()) {
    return { success: false, errorCode: "VALIDATION", message: "Agency is required for this transaction type." }
  }
  if (input.transactionType === "AGENCY_DEPOSIT") {
    const pm = input.paymentMethod ?? RECEIPT_PAYMENT_METHOD.CASH
    if (pm !== RECEIPT_PAYMENT_METHOD.CASH && pm !== RECEIPT_PAYMENT_METHOD.CREDIT_CARD && pm !== RECEIPT_PAYMENT_METHOD.SLIP) {
      return { success: false, errorCode: "VALIDATION", message: "Payment method must be Cash, Credit Card, or Slip." }
    }
  }

  const { method, type, paymentMethod: defaultPaymentMethod } = mapToReceiptMethodAndType(
    input.transactionType
  )
  const paymentMethod =
    input.transactionType === "AGENCY_DEPOSIT"
      ? (input.paymentMethod ?? RECEIPT_PAYMENT_METHOD.CASH)
      : defaultPaymentMethod

  const isCash = paymentMethod === RECEIPT_PAYMENT_METHOD.CASH
  const isAgency = isAgencyType(input.transactionType)
  const needCashierAccount =
    method === RECEIPT_METHOD.BRANCH_INCOME ||
    method === RECEIPT_METHOD.BRANCH_EXPENSE ||
    (method === RECEIPT_METHOD.AGENCY_DEPOSIT && isCash)

  let accounts = await resolveReceiptJournalAccounts({
    locationId: input.branchId,
    createdBy: input.createdBy,
    agencyId: input.agencyId ?? null,
    needTill: needCashierAccount,
  })
  if (!accounts) {
    return {
      success: false,
      errorCode: "CASH_BOOK_NOT_FOUND",
      message:
        "Branch cash book not found for this location. Please set up accounting (cash book) for the branch.",
    }
  }
  const reqResult = await requireReceiptJournalAccounts(
    {
      locationId: input.branchId,
      createdBy: input.createdBy,
      agencyId: input.agencyId ?? null,
      needTill: needCashierAccount,
    },
    { needTill: needCashierAccount, isAgent: isAgency }
  )
  if (!reqResult.success) {
    return { success: false, errorCode: reqResult.errorCode, message: reqResult.error }
  }
  accounts = reqResult.accounts

  const journalNumberResult = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, {
    startFrom: 1,
  })
  const journalNumber = journalNumberResult.success ? journalNumberResult.value : 0

  // Branch is always saved in locationId. For sequence: branch income/expense use locationId;
  // agency types (debit/credit note, deposit, withdraw) use userLocationId (same branch).
  const receiptParams: CreateReceiptWithoutBookingParams = {
    paymentMethod,
    amount: Math.round(input.amount),
    bank: input.bank ?? "",
    bankId: input.bankId ?? null,
    cardReference: input.cardReference ?? "",
    slipReference: input.slipReference ?? "",
    remarks: input.remarks ?? "",
    type,
    method,
    agencyId: input.agencyId ?? null,
    createdBy: input.createdBy ?? null,
    locationId: input.branchId,
    userLocationId: isAgency ? input.branchId : undefined,
  }

  const result = await prisma.$transaction(async (tx) => {
    const r = await createReceiptWithoutBooking(tx, receiptParams)
    if (!r.success) return r
    const journalInput = buildReceiptJournalEntryInput(r.receipt, accounts!)
    if (journalInput && journalNumber > 0) {
      const jResult = await createJournalEntryInTransaction(tx, journalInput, journalNumber)
      if (!jResult.success) throw new Error(jResult.error)
    }
    return r
  })

  if (!result.success) {
    return { success: false, errorCode: result.errorCode, message: result.message }
  }

  const receipt = result.receipt
  const amountRounded = Math.round(input.amount)

  if (input.agencyId) {
    if (input.transactionType === "AGENCY_DEBIT_NOTE") {
      await updateAgentBalance(input.agencyId, amountRounded)
    } else if (input.transactionType === "AGENCY_CREDIT_NOTE") {
      await updateAgentBalance(input.agencyId, -amountRounded)
    } else if (input.transactionType === "AGENCY_DEPOSIT") {
      await updateAgentBalance(input.agencyId, -amountRounded)
    } else if (input.transactionType === "AGENCY_WITHDRAW") {
      await updateAgentBalance(input.agencyId, amountRounded)
    }
  }

  return {
    success: true,
    receiptId: receipt.id,
    receiptNoString: receipt.receiptNoString,
  }
}
