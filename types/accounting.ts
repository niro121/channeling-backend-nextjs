/**
 * Double-entry accounting types and constants.
 * Amounts in smallest unit (e.g. cents).
 */

import { AccountType as PrismaAccountType } from '@prisma/client';

export type AccountType = PrismaAccountType;

export const ACCOUNT_TYPE_CASH = 'CASH' as const;
export const ACCOUNT_TYPE_PAYABLE = 'PAYABLE' as const;
export const ACCOUNT_TYPE_RECEIVABLE = 'RECEIVABLE' as const;

export const REFERENCE_TYPES = {
  Receipt: 'Receipt',
  Booking: 'Booking',
  Manual: 'Manual',
  DoctorPayment: 'DoctorPayment',
} as const;

export type ReferenceType = (typeof REFERENCE_TYPES)[keyof typeof REFERENCE_TYPES];

export type Account = {
  id: string;
  code: string | null;
  name: string;
  type: AccountType;
  parentAccountId: string | null;
  locationId: string | null;
  doctorId: string | null;
  agencyId: string | null;
  creditCustomerId: string | null;
  userId: string | null;
  minBalanceAllowed: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parentAccount?: Account | null;
  location?: { id: string; name: string } | null;
  doctor?: { id: string; name: string; code: string } | null;
  agency?: { id: string; name: string; code: string | null } | null;
  creditCustomer?: { id: string; name: string; code: string | null } | null;
};

export type Journal = {
  id: string;
  journalNumber: number | null;
  date: Date;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  locationId: string | null;
  createdBy: string | null;
  createdAt: Date;
};

/** Till breakdown: same as Receipt.paymentMethod (0 Cash, 1 Credit Card, 2 Slip, 3 Check, 4 Agent, 5 Credit, 6 E-Wallet). Used on journal lines that hit a cashier till. */
export { RECEIPT_PAYMENT_METHOD as TILL_PAYMENT_METHOD } from './receipt';

export type JournalLine = {
  id: string;
  journalId: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  memo: string | null;
  paymentMethod: number | null;
  journal?: Journal;
  account?: Account;
};

export type CreateAccountInput = {
  code?: string | null;
  name: string;
  type: AccountType;
  parentAccountId?: string | null;
  locationId?: string | null;
  doctorId?: string | null;
  agencyId?: string | null;
  creditCustomerId?: string | null;
  userId?: string | null;
  minBalanceAllowed?: number | null;
};

/** For edit: type is fixed; other fields optional. */
export type UpdateAccountInput = {
  name?: string;
  code?: string | null;
  parentAccountId?: string | null;
  locationId?: string | null;
  doctorId?: string | null;
  agencyId?: string | null;
  creditCustomerId?: string | null;
  minBalanceAllowed?: number | null;
  isActive?: boolean;
};

export type JournalLineInput = {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  memo?: string | null;
  /** Till breakdown: 0=cash, 1=card, 2=slip. Set on lines that hit cashier till. */
  paymentMethod?: number | null;
};

export type CreateJournalEntryInput = {
  date: Date;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  locationId?: string | null;
  createdBy?: string | null;
  lines: JournalLineInput[];
};

export type AccountStatementLine = {
  id: string;
  date: Date;
  journalId: string;
  journalNumber: number | null;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  /** Till breakdown: 0=cash, 1=card, 2=slip (null = not till line) */
  paymentMethod?: number | null;
};

export type AccountStatementResult = {
  account: Account;
  lines: AccountStatementLine[];
  openingBalance: number;
  closingBalance: number;
};
