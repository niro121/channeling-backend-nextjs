'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTillBalanceBreakdown, getAccountStatement } from '@/services/accounting.service';
import { getOrCreateAccount } from '@/services/accounting.service';

export type MyTillData = {
  balance: {
    totalCents: number;
    cashCents: number;
    cardCents: number;
    slipCents: number;
    checkCents: number;
    creditCents: number;
    eWalletCents: number;
    tillAccountId: string | null;
    tillAccountName: string | null;
    tillAccountCode: string | null;
  };
  statement: {
    lines: Array<{
      id: string;
      date: Date;
      journalNumber: number | null;
      description: string;
      debitAmount: number;
      creditAmount: number;
      runningBalance: number;
      paymentMethod?: number | null;
    }>;
    openingBalance: number;
    closingBalance: number;
  } | null;
};

const STATEMENT_MAX_DAYS = 31;

function toStartOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function toEndOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

/** Parse YYYY-MM-DD or Date; default to today. Enforce max 31 days range. */
function parseStatementPeriod(
  fromStr?: string | null,
  toStr?: string | null
): { from: Date; to: Date } {
  const today = new Date();
  const fromDefault = toStartOfDay(today);
  const toDefault = toEndOfDay(today);

  if (!fromStr?.trim() && !toStr?.trim()) {
    return { from: fromDefault, to: toDefault };
  }

  const from = fromStr?.trim()
    ? toStartOfDay(new Date(fromStr))
    : fromDefault;
  const to = toStr?.trim()
    ? toEndOfDay(new Date(toStr))
    : toDefault;

  const daysDiff = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (daysDiff > STATEMENT_MAX_DAYS) {
    const toClamped = new Date(from);
    toClamped.setDate(toClamped.getDate() + STATEMENT_MAX_DAYS);
    return { from, to: toEndOfDay(toClamped) };
  }
  if (from.getTime() > to.getTime()) {
    return { from: fromDefault, to: toDefault };
  }
  return { from, to };
}

export type MyTillBalance = MyTillData['balance'];

export async function getMyTillBalance(): Promise<{
  success: boolean;
  data?: MyTillBalance;
  message?: string;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Not signed in.' };
  }
  try {
    const balance = await getTillBalanceBreakdown(userId);
    return {
      success: true,
      data: {
        totalCents: balance.totalCents,
        cashCents: balance.cashCents,
        cardCents: balance.cardCents,
        slipCents: balance.slipCents,
        checkCents: balance.checkCents,
        creditCents: balance.creditCents,
        eWalletCents: balance.eWalletCents,
        tillAccountId: balance.tillAccountId,
        tillAccountName: balance.tillAccountName,
        tillAccountCode: balance.tillAccountCode,
      },
    };
  } catch (error) {
    console.error('getMyTillBalance error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load till balance.',
    };
  }
}

export type MyTillStatement = NonNullable<MyTillData['statement']>;

export async function getMyTillStatement(
  fromDate?: string | null,
  toDate?: string | null
): Promise<{
  success: boolean;
  data?: MyTillStatement | null;
  message?: string;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Not signed in.' };
  }
  const fromStr =
    fromDate == null
      ? undefined
      : typeof fromDate === 'string'
        ? fromDate
        : (fromDate as Date).toISOString().slice(0, 10);
  const toStr =
    toDate == null
      ? undefined
      : typeof toDate === 'string'
        ? toDate
        : (toDate as Date).toISOString().slice(0, 10);
  const { from, to } = parseStatementPeriod(fromStr, toStr);
  try {
    const balance = await getTillBalanceBreakdown(userId);
    if (!balance.tillAccountId) {
      return { success: true, data: null };
    }
    const st = await getAccountStatement(balance.tillAccountId, from, to);
    if (!st) {
      return { success: true, data: null };
    }
    const statement: MyTillStatement = {
      lines: st.lines.map((l) => ({
        id: l.id,
        date: l.date,
        journalNumber: l.journalNumber,
        description: l.description,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
        runningBalance: l.runningBalance,
        paymentMethod: l.paymentMethod,
      })),
      openingBalance: st.openingBalance,
      closingBalance: st.closingBalance,
    };
    return { success: true, data: statement };
  } catch (error) {
    console.error('getMyTillStatement error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load statement.',
    };
  }
}

export async function getMyTillData(fromDate?: string | Date, toDate?: string | null): Promise<{
  success: boolean;
  data?: MyTillData;
  message?: string;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Not signed in.' };
  }

  const fromStr =
    fromDate == null
      ? undefined
      : typeof fromDate === 'string'
        ? fromDate
        : (fromDate as Date).toISOString().slice(0, 10);
  const toStr =
    toDate == null
      ? undefined
      : typeof toDate === 'string'
        ? toDate
        : (toDate as Date).toISOString().slice(0, 10);
  const { from, to } = parseStatementPeriod(fromStr, toStr);

  try {
    const balance = await getTillBalanceBreakdown(userId);
    let statement: MyTillData['statement'] = null;
    if (balance.tillAccountId) {
      const st = await getAccountStatement(balance.tillAccountId, from, to);
      if (st) {
        statement = {
          lines: st.lines.map((l) => ({
            id: l.id,
            date: l.date,
            journalNumber: l.journalNumber,
            description: l.description,
            debitAmount: l.debitAmount,
            creditAmount: l.creditAmount,
            runningBalance: l.runningBalance,
            paymentMethod: l.paymentMethod,
          })),
          openingBalance: st.openingBalance,
          closingBalance: st.closingBalance,
        };
      }
    }

    return {
      success: true,
      data: {
        balance: {
          totalCents: balance.totalCents,
          cashCents: balance.cashCents,
          cardCents: balance.cardCents,
          slipCents: balance.slipCents,
          checkCents: balance.checkCents,
          creditCents: balance.creditCents,
          eWalletCents: balance.eWalletCents,
          tillAccountId: balance.tillAccountId,
          tillAccountName: balance.tillAccountName,
          tillAccountCode: balance.tillAccountCode,
        },
        statement,
      },
    };
  } catch (error) {
    console.error('getMyTillData error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load till.',
    };
  }
}

export async function createMyTillAccount(): Promise<{
  success: boolean;
  message?: string;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Not signed in.' };
  }

  try {
    const result = await getOrCreateAccount({
      type: 'CASH',
      userId,
      name: 'Till - Cashier',
    });
    if (!result.success) {
      return { success: false, message: result.error ?? 'Could not create till account.' };
    }
    revalidatePath('/my-till');
    return { success: true, message: 'Till account created. You can edit it from the linked account section.' };
  } catch (error) {
    console.error('createMyTillAccount error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create till account.',
    };
  }
}
