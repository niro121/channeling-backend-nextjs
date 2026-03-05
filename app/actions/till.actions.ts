'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTillBalanceBreakdown, getAccountStatement } from '@/services/accounting.service';

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

export async function getMyTillData(fromDate?: string | Date, toDate?: string | Date): Promise<{
  success: boolean;
  data?: MyTillData;
  message?: string;
}> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'Not signed in.' };
  }

  try {
    const balance = await getTillBalanceBreakdown(userId);
    let statement: MyTillData['statement'] = null;
    if (balance.tillAccountId) {
      const from = fromDate ? new Date(fromDate) : undefined;
      const to = toDate ? new Date(toDate) : undefined;
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
