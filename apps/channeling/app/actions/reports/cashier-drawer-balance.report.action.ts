'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { formatCents } from '@/lib/format-money';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getCashierDrawerBalanceReportService } from '@/services/reports/cashier-drawer-balance.report.service';
import type {
  CashierDrawerBalanceReportExportRow,
  CashierDrawerBalanceReportQuery
} from '@/types/reports/cashier-drawer-balance';

export async function getCashierDrawerBalanceReportData(query: CashierDrawerBalanceReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getCashierDrawerBalanceReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch cashier drawer balances';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportCashierDrawerBalanceReportData(
  query: CashierDrawerBalanceReportQuery
): Promise<{ success: boolean; data?: CashierDrawerBalanceReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getCashierDrawerBalanceReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: CashierDrawerBalanceReportExportRow[] = result.data.map((r) => {
      const tillLabel = `${r.tillAccountName ?? '-'}${r.tillAccountCode ? ` (${r.tillAccountCode})` : ''}`;
      const cashierLabel = formatUserDisplayName(r.cashierName, r.cashierUserId ?? undefined, r.cashierStaffCode);
      return {
        till: tillLabel,
        cashier: cashierLabel,
        cash: formatCents(r.cashCents),
        card: formatCents(r.cardCents),
        slip: formatCents(r.slipCents),
        check: formatCents(r.checkCents),
        credit: formatCents(r.creditCents),
        eWallet: formatCents(r.eWalletCents),
        total: formatCents(r.totalCents)
      };
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.cashier-drawer-balance.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: {
          asOfDateTime: query.asOfDateTime,
          locationId: query.locationId ?? '__all__',
          count: mapped.length,
          exportedAt: moment().toISOString()
        }
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}

