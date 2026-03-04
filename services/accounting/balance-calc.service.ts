'use server';

import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { netEffectForAccountType } from '@/lib/accounting/helpers';

/** Transaction client with models needed for journal creation and balance read. */
export type AccountingTx = Pick<PrismaClient, 'account' | 'journal' | 'journalLine'>;

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
