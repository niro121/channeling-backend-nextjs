'use server';

import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import type {
  Account,
  CreateAccountInput,
  CreateJournalEntryInput,
  AccountStatementResult,
  AccountStatementLine,
} from '@/types/accounting';
import { validateJournalLines, netEffectForAccountType } from '@/lib/accounting/helpers';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';
import { AccountType } from '@prisma/client';

const JOURNAL_SEQUENCE_SCOPE = 'journal';

/** Transaction client with models needed for journal creation and balance read. */
export type AccountingTx = Pick<PrismaClient, 'account' | 'journal' | 'journalLine'>;

// --- getMainCashBookAccount ---
export async function getMainCashBookAccount(): Promise<Account | null> {
  const row = await prisma.account.findFirst({
    where: {
      type: 'CASH',
      parentAccountId: null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
    },
  });
  return row ? mapAccount(row) : null;
}

// --- getCashBookAccountForBranch ---
export async function getCashBookAccountForBranch(
  locationId: string
): Promise<Account | null> {
  const row = await prisma.account.findFirst({
    where: {
      type: 'CASH',
      locationId,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
    },
  });
  return row ? mapAccount(row) : null;
}

// --- getOrCreateAccount ---
export type GetOrCreateAccountParams = {
  type: AccountType;
  locationId?: string | null;
  doctorId?: string | null;
  agencyId?: string | null;
  userId?: string | null;
  name?: string;
  minBalanceAllowed?: number | null;
};

export async function getOrCreateAccount(
  params: GetOrCreateAccountParams
): Promise<{ success: true; account: Account } | { success: false; error: string }> {
  const { type, locationId, doctorId, agencyId, userId, name, minBalanceAllowed } =
    params;

  const existing = await prisma.account.findFirst({
    where: {
      type,
      locationId: locationId ?? null,
      doctorId: doctorId ?? null,
      agencyId: agencyId ?? null,
      userId: userId ?? null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });

  if (existing) {
    return { success: true, account: mapAccount(existing) };
  }

  const mainCash = type === 'CASH' && !locationId ? null : await getMainCashBookAccount();
  const parentId =
    type === 'CASH' && locationId && mainCash ? mainCash.id : null;

  const defaultName =
    type === 'CASH' && locationId
      ? 'Cash Book - Branch'
      : type === 'PAYABLE' && doctorId
        ? 'Doctor Payable'
        : 'Account';

  const createInput: CreateAccountInput = {
    name: name?.trim() || defaultName,
    type,
    parentAccountId: parentId ?? null,
    locationId: locationId ?? null,
    doctorId: doctorId ?? null,
    agencyId: agencyId ?? null,
    userId: userId ?? null,
    minBalanceAllowed: minBalanceAllowed ?? null,
  };

  const result = await createAccount(createInput);
  if (!result.success) return result;
  return { success: true, account: result.account! };
}

// --- createAccount ---
export async function createAccount(
  data: CreateAccountInput
): Promise<
  { success: true; account: Account } | { success: false; error: string }
> {
  const { type, parentAccountId, locationId, doctorId, agencyId, userId } = data;

  if (type === 'CASH' && locationId && !parentAccountId) {
    const main = await getMainCashBookAccount();
    if (!main) {
      return { success: false, error: 'Main Cash Book account must exist before creating branch accounts' };
    }
    data.parentAccountId = main.id;
  }

  const created = await prisma.account.create({
    data: {
      code: data.code ?? null,
      name: data.name,
      type: data.type,
      parentAccountId: data.parentAccountId ?? null,
      locationId: data.locationId ?? null,
      doctorId: data.doctorId ?? null,
      agencyId: data.agencyId ?? null,
      userId: data.userId ?? null,
      minBalanceAllowed: data.minBalanceAllowed ?? null,
      isActive: true,
    },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });

  return { success: true, account: mapAccount(created) };
}

// --- getAccountBalance ---
export async function getAccountBalance(
  accountId: string,
  asOfDate?: Date
): Promise<number> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { type: true },
  });
  if (!account) return 0;

  const where: { accountId: string; journal?: { date?: { lte?: Date } } } = {
    accountId,
  };
  if (asOfDate) {
    where.journal = { date: { lte: asOfDate } };
  }

  const lines = await prisma.journalLine.findMany({
    where,
    select: { debitAmount: true, creditAmount: true },
    orderBy: { journal: { date: 'asc' } },
  });

  let balance = 0;
  for (const line of lines) {
    const net = netEffectForAccountType(
      line.debitAmount,
      line.creditAmount,
      account.type
    );
    balance += net;
  }
  return balance;
}

/** Same as getAccountBalance but uses transaction client (for use inside $transaction). */
export async function getAccountBalanceWithTx(
  tx: AccountingTx,
  accountId: string
): Promise<number> {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { type: true },
  });
  if (!account) return 0;

  const lines = await tx.journalLine.findMany({
    where: { accountId },
    select: { debitAmount: true, creditAmount: true },
    orderBy: { journal: { date: 'asc' } },
  });

  let balance = 0;
  for (const line of lines) {
    const net = netEffectForAccountType(
      line.debitAmount,
      line.creditAmount,
      account.type
    );
    balance += net;
  }
  return balance;
}

// --- getBranchCashBalance ---
export async function getBranchCashBalance(locationId: string): Promise<number> {
  const acc = await getCashBookAccountForBranch(locationId);
  if (!acc) return 0;
  return getAccountBalance(acc.id);
}

// --- getCashierFloatBalance: balance of cashier's CASH account (float), 0 if no account ---
export async function getCashierFloatBalance(userId: string): Promise<number> {
  const acc = await prisma.account.findFirst({
    where: { type: 'CASH', userId, isActive: true },
    select: { id: true },
  });
  if (!acc) return 0;
  return getAccountBalance(acc.id);
}

// --- getFullInstituteCashBalance ---
export async function getFullInstituteCashBalance(
  asOfDate?: Date
): Promise<number> {
  const main = await getMainCashBookAccount();
  if (!main) return 0;

  let total = await getAccountBalance(main.id, asOfDate);

  const children = await prisma.account.findMany({
    where: { parentAccountId: main.id, type: 'CASH', isActive: true },
    select: { id: true },
  });
  for (const c of children) {
    total += await getAccountBalance(c.id, asOfDate);
  }
  return total;
}

// --- createJournalEntry (with minBalanceAllowed check) ---
export async function createJournalEntry(
  input: CreateJournalEntryInput
): Promise<
  | { success: true; journalId: string }
  | { success: false; error: string; errorCode?: string; accountId?: string }
> {
  const validation = validateJournalLines(input.lines);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true,
      name: true,
      type: true,
      minBalanceAllowed: true,
    },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  for (const acc of accounts) {
    if (acc.minBalanceAllowed === null) continue;

    const netEffect = input.lines
      .filter((l) => l.accountId === acc.id)
      .reduce(
        (sum, l) =>
          sum + netEffectForAccountType(l.debitAmount, l.creditAmount, acc.type),
        0
      );

    const currentBalance = await getAccountBalance(acc.id);
    const newBalance = currentBalance + netEffect;

    if (newBalance < acc.minBalanceAllowed) {
      return {
        success: false,
        error: `Account "${acc.name}" would go below allowed minimum (${acc.minBalanceAllowed})`,
        errorCode: 'INSUFFICIENT_BALANCE',
        accountId: acc.id,
      };
      }
  }

  const seqResult = await getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, {
    startFrom: 1,
  });
  const journalNumber = seqResult.success ? seqResult.value : null;

  const journal = await prisma.journal.create({
    data: {
      journalNumber,
      date: input.date,
      description: input.description,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      locationId: input.locationId ?? null,
      createdBy: input.createdBy ?? null,
    },
  });

  await prisma.journalLine.createMany({
    data: input.lines.map((l) => ({
      journalId: journal.id,
      accountId: l.accountId,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
      memo: l.memo ?? '',
    })),
  });

  return { success: true, journalId: journal.id };
}

/**
 * Create a journal entry inside an existing transaction. Use when receipt and journal must be atomic.
 * Call getNextSequenceNumber(JOURNAL_SEQUENCE_SCOPE, { startFrom: 1 }) before the transaction and pass the value.
 */
export async function createJournalEntryInTransaction(
  tx: AccountingTx,
  input: CreateJournalEntryInput,
  journalNumber: number
): Promise<
  | { success: true; journalId: string }
  | { success: false; error: string; errorCode?: string; accountId?: string }
> {
  const validation = validateJournalLines(input.lines);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  const accounts = await tx.account.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true,
      name: true,
      type: true,
      minBalanceAllowed: true,
    },
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  for (const acc of accounts) {
    if (acc.minBalanceAllowed === null) continue;

    const netEffect = input.lines
      .filter((l) => l.accountId === acc.id)
      .reduce(
        (sum, l) =>
          sum + netEffectForAccountType(l.debitAmount, l.creditAmount, acc.type),
        0
      );

    const currentBalance = await getAccountBalanceWithTx(tx, acc.id);
    const newBalance = currentBalance + netEffect;

    if (newBalance < acc.minBalanceAllowed) {
      return {
        success: false,
        error: `Account "${acc.name}" would go below allowed minimum (${acc.minBalanceAllowed})`,
        errorCode: 'INSUFFICIENT_BALANCE',
        accountId: acc.id,
      };
    }
  }

  const journal = await tx.journal.create({
    data: {
      journalNumber,
      date: input.date,
      description: input.description,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      locationId: input.locationId ?? null,
      createdBy: input.createdBy ?? null,
    },
  });

  await tx.journalLine.createMany({
    data: input.lines.map((l) => ({
      journalId: journal.id,
      accountId: l.accountId,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
      memo: l.memo ?? '',
    })),
  });

  return { success: true, journalId: journal.id };
}

// --- getAccountStatement ---
export async function getAccountStatement(
  accountId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<AccountStatementResult | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });
  if (!account) return null;

  const journalWhere: { date?: { gte?: Date; lte?: Date } } = {};
  if (fromDate) journalWhere.date = { ...journalWhere.date, gte: fromDate };
  if (toDate) journalWhere.date = { ...journalWhere.date, lte: toDate };

  const lines = await prisma.journalLine.findMany({
    where: {
      accountId,
      ...(Object.keys(journalWhere).length
        ? { journal: journalWhere }
        : {}),
    },
    include: {
      journal: true,
    },
  });

  lines.sort((a, b) => {
    const d = a.journal.date.getTime() - b.journal.date.getTime();
    if (d !== 0) return d;
    return (
      (a.journal.createdAt?.getTime() ?? 0) - (b.journal.createdAt?.getTime() ?? 0)
    );
  });

  const openingBalance = fromDate
    ? await getAccountBalance(accountId, new Date(fromDate.getTime() - 1))
    : 0;

  let running = openingBalance;
  const resultLines: AccountStatementLine[] = lines.map((line) => {
    const net = netEffectForAccountType(
      line.debitAmount,
      line.creditAmount,
      account.type
    );
    running += net;
    return {
      id: line.id,
      date: line.journal.date,
      journalId: line.journalId,
      journalNumber: line.journal.journalNumber,
      description: line.journal.description,
      referenceType: line.journal.referenceType,
      referenceId: line.journal.referenceId,
      debitAmount: line.debitAmount,
      creditAmount: line.creditAmount,
      runningBalance: running,
    };
  });

  return {
    account: mapAccount(account),
    lines: resultLines,
    openingBalance,
    closingBalance: running,
  };
}

// --- getAllAccounts (for list page) ---
export type GetAllAccountsParams = {
  page?: number;
  limit?: number;
  type?: AccountType | null;
  locationId?: string | null;
  keyword?: string | null;
};

export async function getAllAccounts(
  params: GetAllAccountsParams = {}
): Promise<{
  success: boolean;
  data?: Account[];
  totalRecords?: number;
  error?: string;
}> {
  const { page = 0, limit = 50, type, locationId, keyword } = params;

  const where: {
    isActive?: boolean;
    type?: AccountType;
    locationId?: string | null;
    OR?: { name?: { contains: string; mode: 'insensitive' }; code?: { contains: string; mode: 'insensitive' } }[];
  } = { isActive: true };

  if (type) where.type = type;
  if (locationId) where.locationId = locationId;
  if (keyword && keyword.trim()) {
    where.OR = [
      { name: { contains: keyword.trim(), mode: 'insensitive' } },
      { code: { contains: keyword.trim(), mode: 'insensitive' } },
    ];
  }

  const [totalRecords, rows] = await Promise.all([
    prisma.account.count({ where }),
    prisma.account.findMany({
      where,
      include: {
        location: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, code: true } },
        agency: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      skip: page * limit,
      take: limit,
    }),
  ]);

  const accountsWithBalance: (Account & { balance: number })[] = [];
  for (const row of rows) {
    const balance = await getAccountBalance(row.id);
    accountsWithBalance.push({ ...mapAccount(row), balance });
  }

  return {
    success: true,
    data: accountsWithBalance,
    totalRecords,
  };
}

// --- getAccountById ---
export async function getAccountById(
  id: string
): Promise<Account | null> {
  const row = await prisma.account.findUnique({
    where: { id },
    include: {
      parentAccount: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
    },
  });
  return row ? mapAccount(row) : null;
}

// --- mapAccount ---
function mapAccount(
  row: {
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
    location?: { id: string; name: string } | null;
    doctor?: { id: string; name: string; code: string } | null;
    agency?: { id: string; name: string; code: string | null } | null;
  }
): Account {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    parentAccountId: row.parentAccountId,
    locationId: row.locationId,
    doctorId: row.doctorId,
    agencyId: row.agencyId,
    userId: row.userId,
    minBalanceAllowed: row.minBalanceAllowed,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    location: row.location ?? null,
    doctor: row.doctor ?? null,
    agency: row.agency ?? null,
  };
}
