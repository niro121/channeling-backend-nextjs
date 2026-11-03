'use server';

import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';
import { netEffectForAccountType } from '@/lib/accounting/helpers';
import { sumAccountLinesAsOf } from '@/services/accounting/journal-lines-as-of';

/** Transaction client with models needed for journal creation and balance read. */
export type AccountingTx = Pick<PrismaClient, 'account' | 'journal' | 'journalLine'>;

/**
 * Balance for one account. Uses DB aggregation (SUM) so it stays fast with millions of lines.
 */
export async function getAccountBalance(
  accountId: string,
  asOfDate?: Date
): Promise<number> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { type: true },
  });
  if (!account) return 0;

  if (asOfDate) {
    const totals = await sumAccountLinesAsOf([accountId], asOfDate);
    const sumDebit = totals.reduce((sum, row) => sum + row._sum.debitAmount, 0);
    const sumCredit = totals.reduce((sum, row) => sum + row._sum.creditAmount, 0);
    return netEffectForAccountType(sumDebit, sumCredit, account.type);
  }

  const result = await prisma.journalLine.groupBy({
    by: ['accountId'],
    where: { accountId },
    _sum: { debitAmount: true, creditAmount: true },
  });

  const row = result[0];
  const sumDebit = row?._sum?.debitAmount ?? 0;
  const sumCredit = row?._sum?.creditAmount ?? 0;
  return netEffectForAccountType(sumDebit, sumCredit, account.type);
}

/**
 * Same as getAccountBalance but uses transaction client (for use inside $transaction).
 * Uses DB aggregation so it stays fast with many lines.
 */
export async function getAccountBalanceWithTx(
  tx: AccountingTx,
  accountId: string
): Promise<number> {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { type: true },
  });
  if (!account) return 0;

  const result = await tx.journalLine.groupBy({
    by: ['accountId'],
    where: { accountId },
    _sum: { debitAmount: true, creditAmount: true },
  });

  const row = result[0];
  const sumDebit = row?._sum?.debitAmount ?? 0;
  const sumCredit = row?._sum?.creditAmount ?? 0;
  return netEffectForAccountType(sumDebit, sumCredit, account.type);
}
