import prisma from "@/lib/prisma"
import {
  createJournalEntryInTransaction,
  getTillBalanceBreakdownForAccount,
  getTillBalanceCentsByMethod,
} from "@/services/accounting.service"
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
import { getAgentBalance } from "@/services/channel-booking/helpers/get-agent-balance"
import { updateAgentBalance } from "@/services/channel-booking/helpers/update-agent-balance"
import { formatCents } from "@/lib/format-money"
import { logActivityNonBlocking } from "@/lib/activity-log"
import {
  RECEIPT_METHOD,
  RECEIPT_PAYMENT_METHOD,
} from "@/types/receipt"
import { requireActiveShift, getCurrentShift } from "@/services/shift.service"

const JOURNAL_SEQUENCE_SCOPE = "journal"

export const LEDGER_TRANSACTION_TYPES = [
  "BRANCH_INCOME",
  "BRANCH_EXPENSE",
  "AGENCY_DEBIT_NOTE",
  "AGENCY_CREDIT_NOTE",
  "AGENCY_DEPOSIT",
  "AGENCY_WITHDRAW",
  "BANK_DEPOSIT",
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
  userLocationId?: string | null
  agencyId?: string | null
  bankAccountId?: string | null
  amount: number
  remarks?: string
  createdBy: string | null
  /** For AGENCY_DEPOSIT only: 0 Cash, 1 Credit Card, 2 Slip, 3 Cheque, 6 E-Wallet */
  paymentMethod?: number
  bank?: string
  bankId?: string | null
  cardReference?: string
  slipReference?: string
  /** For agency deposit via slip: slip date (YYYY-MM-DD) */
  slipDate?: string
}

export type CreateLedgerReceiptResult =
  | { success: true; receiptId: string; receiptNoString: string }
  | { success: false; errorCode: string; message: string }

function getTillPaymentMethodLabel(pm: number): string {
  const labels: Record<number, string> = {
    0: "cash",
    1: "card",
    2: "slip",
    3: "cheque",
    6: "e-wallet",
  }
  return labels[pm] ?? "cash"
}

async function clearAgencyViolationIfEligible(
  agencyId: string,
  actingUserId: string | null
): Promise<void> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      id: true,
      creditLimit: true,
      isCreditLimitViolation: true,
      allowedCreditLimit: true,
      name: true,
      code: true,
    },
  })
  if (!agency?.isCreditLimitViolation) return

  const balanceCents = await getAgentBalance(agencyId)
  const balanceRupees = balanceCents / 100
  const debtRupees = Math.max(0, -balanceRupees)
  const creditLimit = Number(agency.creditLimit ?? 0)

  // Clearance threshold: debt should be at or below credit limit.
  if (debtRupees <= creditLimit) {
    const oldAllowed = Number(agency.allowedCreditLimit ?? 0)
    const newAllowed = creditLimit

    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        allowedCreditLimit: creditLimit,
        isCreditLimitViolation: false,
        creditLimitViolationAt: null,
        creditLimitViolationReason: null,
      },
    })

    if (
      actingUserId &&
      Number.isFinite(oldAllowed) &&
      Number.isFinite(newAllowed) &&
      oldAllowed !== newAllowed
    ) {
      logActivityNonBlocking({
        userId: actingUserId,
        action: "agencies.limit.soft_changed",
        entityType: "Agency",
        entityId: agencyId,
        importance: "high",
        metadata: {
          agencyName: agency.name,
          agencyCode: agency.code,
          field: "allowedCreditLimit",
          oldValue: oldAllowed,
          newValue: newAllowed,
          delta: newAllowed - oldAllowed,
          source: "agency_deposit_violation_auto_clear",
        },
      })
    }
  }
}

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
    case "BANK_DEPOSIT":
      // Bank deposit moves cash out of till into bank ledger (outflow from cashier perspective).
      return { method: RECEIPT_METHOD.BANK_DEPOSIT, type: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH }
    default:
      throw new Error(`Unknown transaction type: ${transactionType}`)
  }
}

export async function createLedgerReceipt(
  input: CreateLedgerReceiptInput
): Promise<CreateLedgerReceiptResult> {
  let shiftId: string | null = null
  if (input.createdBy) {
    await requireActiveShift(input.createdBy)
    const shift = await getCurrentShift(input.createdBy)
    shiftId = shift?.id ?? null
  }

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
    if (
      pm !== RECEIPT_PAYMENT_METHOD.CASH &&
      pm !== RECEIPT_PAYMENT_METHOD.CREDIT_CARD &&
      pm !== RECEIPT_PAYMENT_METHOD.SLIP &&
      pm !== RECEIPT_PAYMENT_METHOD.CHECK &&
      pm !== RECEIPT_PAYMENT_METHOD.E_WALLET
    ) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: "Payment method must be Cash, Credit Card, Slip, Cheque, or E-Wallet.",
      }
    }
    if (pm === RECEIPT_PAYMENT_METHOD.SLIP && !input.slipDate?.trim()) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: "Slip date is required for slip payments.",
      }
    }
  }
  if (input.transactionType === "BANK_DEPOSIT") {
    if (!input.bankAccountId?.trim()) {
      return { success: false, errorCode: "VALIDATION", message: "Bank account is required for bank deposit." }
    }
    if (input.paymentMethod != null && input.paymentMethod !== RECEIPT_PAYMENT_METHOD.CASH) {
      return { success: false, errorCode: "VALIDATION", message: "Bank deposit supports cash only." }
    }
  }

  // Agency withdraw: ensure the agent has sufficient balance (cannot withdraw more than they have with us)
  if (input.transactionType === "AGENCY_WITHDRAW" && input.agencyId) {
    const agentBalanceCents = await getAgentBalance(input.agencyId)
    const withdrawAmountCents = Math.round(input.amount * 100)
    if (agentBalanceCents < withdrawAmountCents) {
      return {
        success: false,
        errorCode: "INSUFFICIENT_AGENCY_BALANCE",
        message:
          agentBalanceCents <= 0
            ? "This agency has no balance to withdraw. They must deposit first."
            : `Insufficient agency balance. Available: ${formatCents(agentBalanceCents)} LKR, requested: ${formatCents(withdrawAmountCents)} LKR.`,
      }
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
  const isBankDeposit = input.transactionType === "BANK_DEPOSIT"
  const needCashierAccount =
    method === RECEIPT_METHOD.BRANCH_INCOME ||
    method === RECEIPT_METHOD.BRANCH_EXPENSE ||
    (method === RECEIPT_METHOD.AGENCY_DEPOSIT && isCash) ||
    method === RECEIPT_METHOD.AGENCY_WITHDRAW ||
    method === RECEIPT_METHOD.BANK_DEPOSIT

  let accounts = await resolveReceiptJournalAccounts({
    locationId: input.branchId,
    createdBy: input.createdBy,
    userLocationId: input.userLocationId ?? null,
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
      userLocationId: input.userLocationId ?? null,
      agencyId: input.agencyId ?? null,
      needTill: needCashierAccount,
    },
    { needTill: needCashierAccount, isAgent: isAgency }
  )
  if (!reqResult.success) {
    return { success: false, errorCode: reqResult.errorCode, message: reqResult.error }
  }
  accounts = reqResult.accounts

  // Transactions that pay out from the till: till must have sufficient balance for this payment method
  const amountCents = Math.round(input.amount * 100)
  const paysOutFromTill =
    input.transactionType === "AGENCY_WITHDRAW" || input.transactionType === "BRANCH_EXPENSE" || input.transactionType === "BANK_DEPOSIT"
  if (paysOutFromTill && accounts.cashierAccountId) {
    const breakdown = await getTillBalanceBreakdownForAccount(accounts.cashierAccountId)
    const tillBalanceCents = getTillBalanceCentsByMethod(breakdown, paymentMethod)
    if (tillBalanceCents < amountCents) {
      const methodLabel = getTillPaymentMethodLabel(paymentMethod)
      return {
        success: false,
        errorCode: "INSUFFICIENT_TILL_BALANCE",
        message:
          tillBalanceCents <= 0
            ? `Till has no ${methodLabel} balance. Cannot complete this transaction until the till has sufficient ${methodLabel}.`
            : `Insufficient ${methodLabel} balance in till. Available: ${formatCents(tillBalanceCents)} LKR, required: ${formatCents(amountCents)} LKR.`,
      }
    }
  }

  let bankDepositAccount:
    | {
        id: string
        name: string
        accountNumber: string
        accountId: string | null
      }
    | null = null
  if (input.transactionType === "BANK_DEPOSIT") {
    bankDepositAccount = await prisma.bankAccount.findFirst({
      where: { id: input.bankAccountId!, status: 1 },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        accountId: true,
      },
    })
    if (!bankDepositAccount) {
      return { success: false, errorCode: "VALIDATION", message: "Selected bank account is not active or not found." }
    }
    if (!bankDepositAccount.accountId) {
      return { success: false, errorCode: "VALIDATION", message: "Selected bank account is not linked to a GL account." }
    }
    if (!accounts.cashierAccountId) {
      return { success: false, errorCode: "CASHIER_ACCOUNT_ERROR", message: "Till account could not be resolved for bank deposit." }
    }
  }

  const journalNumberResult = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, {
    startFrom: 1,
  })
  const journalNumber = journalNumberResult.success ? journalNumberResult.value : 0

  // Outflow types: store amount as negative (same convention as refund, doctor payment) so reports/print show minus.
  const isOutflow =
    input.transactionType === "BRANCH_EXPENSE" ||
    input.transactionType === "AGENCY_CREDIT_NOTE" ||
    input.transactionType === "AGENCY_WITHDRAW" ||
    input.transactionType === "BANK_DEPOSIT";
  const receiptAmount = isOutflow ? -1 * Math.round(input.amount) : Math.round(input.amount);

  // Branch is always saved in locationId. For sequence: branch income/expense use locationId;
  // agency types (debit/credit note, deposit, withdraw) use userLocationId (same branch).
  const receiptParams: CreateReceiptWithoutBookingParams = {
    paymentMethod,
    amount: receiptAmount,
    bank:
      input.transactionType === "BANK_DEPOSIT"
        ? (bankDepositAccount?.name ?? "")
        : (input.bank ?? ""),
    bankId:
      input.transactionType === "BANK_DEPOSIT"
        ? (input.bankAccountId ?? null)
        : (input.bankId ?? null),
    cardReference: input.cardReference ?? "",
    slipReference: input.slipReference ?? "",
    remarks:
      input.transactionType === "AGENCY_DEPOSIT" &&
      paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP &&
      input.slipDate?.trim()
        ? `${input.remarks ?? ""} | Slip Date: ${input.slipDate.trim()}`
        : (input.remarks ?? ""),
    type,
    method,
    agencyId: input.agencyId ?? null,
    createdBy: input.createdBy ?? null,
    locationId: input.branchId,
    userLocationId: isAgency || isBankDeposit ? (input.userLocationId ?? input.branchId) : undefined,
    shiftId: shiftId ?? undefined,
  }

  const result = await prisma.$transaction(async (tx) => {
    const r = await createReceiptWithoutBooking(tx, receiptParams)
    if (!r.success) return r
    const journalInput =
      input.transactionType === "BANK_DEPOSIT" && bankDepositAccount
        ? {
            date: r.receipt.createdAt ?? new Date(),
            description: `Bank deposit - ${bankDepositAccount.name} (${bankDepositAccount.accountNumber})${r.receipt.receiptNoString ? ` - Receipt ${r.receipt.receiptNoString}` : ""}`,
            referenceType: "Receipt",
            referenceId: r.receipt.id,
            locationId: r.receipt.locationId ?? null,
            createdBy: r.receipt.createdBy ?? null,
            lines: [
              { accountId: bankDepositAccount.accountId!, debitAmount: amountCents, creditAmount: 0 },
              {
                accountId: accounts!.cashierAccountId!,
                debitAmount: 0,
                creditAmount: amountCents,
                paymentMethod: RECEIPT_PAYMENT_METHOD.CASH,
              },
            ],
          }
        : buildReceiptJournalEntryInput(r.receipt, accounts!)
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
      await clearAgencyViolationIfEligible(input.agencyId, input.createdBy ?? null)
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
