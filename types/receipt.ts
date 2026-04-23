/**
 * Receipt model constants (Prisma Receipt.method and Receipt.paymentMethod).
 * Use these when creating receipts or when building journal entries from receipts.
 */

/** Receipt.method: 0 REFUND, 1 PAYMENT, 2 DEBIT NOTE, 3 CREDIT NOTE, 4 DOCTOR PAYMENT, 5 DOCTOR CANCEL, 6 AGENCY DEPOSIT, 7 AGENCY WITHDRAW, 8 BRANCH INCOME, 9 BRANCH EXPENSE, 10 BANK DEPOSIT, 11 BANK WITHDRAW */
export const RECEIPT_METHOD = {
  REFUND: 0,
  PAYMENT: 1,
  DEBIT_NOTE: 2,
  CREDIT_NOTE: 3,
  DOCTOR_PAYMENT: 4,
  DOCTOR_CANCEL: 5,
  AGENCY_DEPOSIT: 6,
  AGENCY_WITHDRAW: 7,
  BRANCH_INCOME: 8,
  BRANCH_EXPENSE: 9,
  BANK_DEPOSIT: 10,
  BANK_WITHDRAW: 11,
} as const;

/** Receipt.paymentMethod: 0 Cash, 1 Credit Card, 2 Slip, 3 Check, 4 Agent, 5 Credit */
export const RECEIPT_PAYMENT_METHOD = {
  CASH: 0,
  CREDIT_CARD: 1,
  SLIP: 2,
  CHECK: 3,
  AGENT: 4,
  CREDIT: 5,
  E_WALLET: 6,
} as const;

export const PAYMENT_METHOD_NAMES: Record<number, string> = {
  [RECEIPT_PAYMENT_METHOD.CASH]: 'Cash',
  [RECEIPT_PAYMENT_METHOD.CREDIT_CARD]: 'Credit Card',
  [RECEIPT_PAYMENT_METHOD.SLIP]: 'Slip',
  [RECEIPT_PAYMENT_METHOD.CHECK]: 'Cheque',
  [RECEIPT_PAYMENT_METHOD.AGENT]: 'Agent',
  [RECEIPT_PAYMENT_METHOD.CREDIT]: 'Credit Customer',
  [RECEIPT_PAYMENT_METHOD.E_WALLET]: 'E-Wallet',
};

export const RECEIPT_METHOD_NAMES: Record<number, string> = {
  [RECEIPT_METHOD.REFUND]: 'Refund',
  [RECEIPT_METHOD.PAYMENT]: 'Settlement',
  [RECEIPT_METHOD.DEBIT_NOTE]: 'Debit Note',
  [RECEIPT_METHOD.CREDIT_NOTE]: 'Credit Note',
  [RECEIPT_METHOD.DOCTOR_PAYMENT]: 'Doctor Payment',
  [RECEIPT_METHOD.DOCTOR_CANCEL]: 'Doctor Cancel',
  [RECEIPT_METHOD.AGENCY_DEPOSIT]: 'Agency Deposit',
  [RECEIPT_METHOD.AGENCY_WITHDRAW]: 'Agency Withdraw',
  [RECEIPT_METHOD.BRANCH_INCOME]: 'Branch Income',
  [RECEIPT_METHOD.BRANCH_EXPENSE]: 'Branch Expense',
  [RECEIPT_METHOD.BANK_DEPOSIT]: 'Bank Deposit',
  [RECEIPT_METHOD.BANK_WITHDRAW]: 'Bank Withdraw',
};
