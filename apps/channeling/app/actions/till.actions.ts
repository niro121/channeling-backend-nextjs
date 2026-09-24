'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  getTillBalanceBreakdownForAccount,
  getAccountStatement,
  ensureTillForUserLocation,
} from '@/services/accounting.service';
import {
  listTillsForUser,
  resolveActiveTillForUserLocation,
  resolveTillForUserAndLocation,
} from '@/services/accounting.service';

export type MyTillBalance = {
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
  tillLocationId: string | null;
  tillLocationName: string | null;
  tillLocationCode: string | null;
  tillId: string | null;
  availableTills: Array<{
    tillId: string;
    accountId: string;
    accountName: string | null;
    accountCode: string | null;
    locationId: string;
    locationName: string | null;
    locationCode: string | null;
    isActive: boolean;
    isCurrentAssigned: boolean;
  }>;
  otherTills: Array<{
    tillId: string;
    accountId: string;
    accountName: string | null;
    accountCode: string | null;
    locationId: string;
    locationName: string | null;
    locationCode: string | null;
  }>;
};

const STATEMENT_MAX_DAYS = 31;

/** Parse YYYY-MM-DD to start/end of that day in server local time (matches journal dates created with new Date()). */
function parseLocalDay(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start, end };
}

/** Parse from/to strings; default to today (server local). Clamp range to STATEMENT_MAX_DAYS. */
function parseStatementPeriod(
  fromStr?: string | null,
  toStr?: string | null
): { from: Date; to: Date } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (!fromStr?.trim() && !toStr?.trim()) {
    return { from: todayStart, to: todayEnd };
  }

  const fromParsed = fromStr?.trim() ? parseLocalDay(fromStr) : null;
  const toParsed = toStr?.trim() ? parseLocalDay(toStr) : null;
  const from = fromParsed ? fromParsed.start : todayStart;
  const to = toParsed ? toParsed.end : todayEnd;

  const daysDiff = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  if (daysDiff > STATEMENT_MAX_DAYS) {
    const toClamped = new Date(from.getTime());
    toClamped.setDate(toClamped.getDate() + STATEMENT_MAX_DAYS);
    toClamped.setHours(23, 59, 59, 999);
    return { from, to: toClamped };
  }
  if (from.getTime() > to.getTime()) {
    return { from: todayStart, to: todayEnd };
  }
  return { from, to };
}

export type MyTillStatement = {
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
};

export async function getMyTillStatement(
  fromDate?: string | null,
  toDate?: string | null,
  selectedTillId?: string | null
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
    const till = await resolveSelectedTill(userId, selectedTillId);
    if (!till?.accountId) {
      return { success: true, data: null };
    }
    const st = await getAccountStatement(till.accountId, from, to);
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
    logActivityNonBlocking({
      userId,
      action: 'till.statement.viewed',
      entityType: 'MyTill',
      importance: 'low',
      metadata: { from: fromStr ?? undefined, to: toStr ?? undefined },
    });
    return { success: true, data: statement };
  } catch (error) {
    console.error('getMyTillStatement error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load statement.',
    };
  }
}

export async function getMyTillBalance(selectedTillId?: string | null): Promise<{
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
    const activeTill = await resolveActiveTillForUserLocation(userId);
    const allTills = await listTillsForUser(userId);
    const selectedTill =
      (selectedTillId ? allTills.find((t) => t.tillId === selectedTillId) : null) ??
      (activeTill ? allTills.find((t) => t.tillId === activeTill.tillId) : null) ??
      allTills[0] ??
      null;
    if (!selectedTill) {
      return {
        success: true,
        data: {
          totalCents: 0,
          cashCents: 0,
          cardCents: 0,
          slipCents: 0,
          checkCents: 0,
          creditCents: 0,
          eWalletCents: 0,
          tillAccountId: null,
          tillAccountName: null,
          tillAccountCode: null,
          tillLocationId: null,
          tillLocationName: null,
          tillLocationCode: null,
          tillId: null,
          availableTills: [],
          otherTills: [],
        },
      };
    }
    const balance = await getTillBalanceBreakdownForActiveTill(userId, selectedTill.locationId);
    const otherTills = allTills
      .filter((t) => t.tillId !== selectedTill.tillId)
      .map((t) => ({
        tillId: t.tillId,
        accountId: t.accountId,
        accountName: t.accountName,
        accountCode: t.accountCode,
        locationId: t.locationId,
        locationName: t.locationName,
        locationCode: t.locationCode,
      }));
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
        tillLocationId: selectedTill.locationId,
        tillLocationName: selectedTill.locationName,
        tillLocationCode: selectedTill.locationCode,
        tillId: selectedTill.tillId,
        availableTills: allTills.map((t) => ({
          ...t,
          isCurrentAssigned: activeTill ? t.tillId === activeTill.tillId : false,
        })),
        otherTills,
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
    const sessionUser = await getSessionUserLocation(userId);
    if (!sessionUser.userLocationId) {
      return { success: false, message: 'Set your default location before creating a till.' };
    }
    const till = await ensureTillForUserLocation({
      userId,
      locationId: sessionUser.userLocationId,
      isActive: true,
    });
    if (!till.success) {
      return { success: false, message: till.error ?? 'Could not create till account.' };
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

async function getSessionUserLocation(userId: string): Promise<{ userLocationId: string | null }> {
  const prisma = (await import('@/lib/prisma')).default;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userLocationId: true },
  });
  return { userLocationId: user?.userLocationId ?? null };
}

async function getTillBalanceBreakdownForActiveTill(userId: string, locationId: string) {
  const till = await resolveTillForUserAndLocation(userId, locationId);
  return getTillBalanceBreakdownForAccount(till.accountId);
}

async function resolveSelectedTill(userId: string, selectedTillId?: string | null) {
  const allTills = await listTillsForUser(userId);
  if (selectedTillId) {
    const selected = allTills.find((t) => t.tillId === selectedTillId);
    if (selected) return selected;
  }
  const activeTill = await resolveActiveTillForUserLocation(userId);
  if (activeTill) {
    const activeInList = allTills.find((t) => t.tillId === activeTill.tillId);
    if (activeInList) return activeInList;
  }
  return allTills[0] ?? null;
}
