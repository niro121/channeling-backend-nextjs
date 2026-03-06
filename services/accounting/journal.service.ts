'use server';

import prisma from '@/lib/prisma';
import type { CreateJournalEntryInput } from '@/types/accounting';
import { validateJournalLines, netEffectForAccountType } from '@/lib/accounting/helpers';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';
import type { AccountingTx } from './balance-calc.service';
import { getAccountBalance, getAccountBalanceWithTx } from './balance-calc.service';

const JOURNAL_SEQUENCE_SCOPE = 'journal';

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
      paymentMethod: l.paymentMethod ?? null,
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
      paymentMethod: l.paymentMethod ?? null,
    })),
  });

  return { success: true, journalId: journal.id };
}
