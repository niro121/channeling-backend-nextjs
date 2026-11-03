import prisma from '@/lib/prisma';

const JOURNAL_ID_BATCH_SIZE = 5000;

/**
 * Runs `load` over `ids` in fixed-size batches, one batch at a time, so a large `in` list never
 * becomes a single oversized Mongo query.
 */
export async function loadInIdBatches<T>(
  ids: string[],
  load: (batch: string[]) => Promise<T[]>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += JOURNAL_ID_BATCH_SIZE) {
    results.push(...(await load(ids.slice(i, i + JOURNAL_ID_BATCH_SIZE))));
  }
  return results;
}

export type AccountLineTotals = {
  accountId: string;
  paymentMethod: number | null;
  _sum: { debitAmount: number; creditAmount: number };
};

/**
 * Debit and credit totals per account and payment method, for journals dated on or before `asOf`.
 *
 * Starts from the given accounts' lines (indexed on accountId) and then checks only those lines'
 * journals. Starting from "every journal up to asOf" would load the whole ledger's ids into memory
 * for each call.
 */
export async function sumAccountLinesAsOf(
  accountIds: string[],
  asOf: Date
): Promise<AccountLineTotals[]> {
  if (accountIds.length === 0) return [];

  const lines = await prisma.journalLine.findMany({
    where: { accountId: { in: accountIds } },
    select: {
      accountId: true,
      journalId: true,
      paymentMethod: true,
      debitAmount: true,
      creditAmount: true,
    },
  });
  if (lines.length === 0) return [];

  const journals = await loadInIdBatches(
    Array.from(new Set(lines.map((line) => line.journalId))),
    (batch) =>
      prisma.journal.findMany({
        where: { id: { in: batch }, date: { lte: asOf } },
        select: { id: true },
      })
  );
  const journalIdsInRange = new Set(journals.map((journal) => journal.id));

  const totals = new Map<string, AccountLineTotals>();
  for (const line of lines) {
    if (!journalIdsInRange.has(line.journalId)) continue;
    const key = `${line.accountId}|${line.paymentMethod ?? ''}`;
    const row = totals.get(key) ?? {
      accountId: line.accountId,
      paymentMethod: line.paymentMethod,
      _sum: { debitAmount: 0, creditAmount: 0 },
    };
    row._sum.debitAmount += line.debitAmount;
    row._sum.creditAmount += line.creditAmount;
    totals.set(key, row);
  }
  return Array.from(totals.values());
}
