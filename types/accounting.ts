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
  userId: string | null;
  minBalanceAllowed: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parentAccount?: Account | null;
  location?: { id: string; name: string } | null;
  doctor?: { id: string; name: string; code: string } | null;
  agency?: { id: string; name: string; code: string | null } | null;
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

export type JournalLine = {
  id: string;
  journalId: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  memo: string | null;
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
  userId?: string | null;
  minBalanceAllowed?: number | null;
};

export type JournalLineInput = {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  memo?: string | null;
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
};

export type AccountStatementResult = {
  account: Account;
  lines: AccountStatementLine[];
  openingBalance: number;
  closingBalance: number;
};
