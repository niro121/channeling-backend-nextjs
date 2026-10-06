'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import { formatCents } from '@/lib/format-money';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getCashierShortBalanceReportService } from '@/services/reports/cashier-short-balance.report.service';
import type {
  CashierShortBalanceReportExportRow,
  CashierShortBalanceReportQuery
} from '@/types/reports/cashier-short-balance';

function formatAccount(name: string | null, code: string | null): string {
  const label = (name ?? '').trim() || '-';
  return code ? `${label} (${code})` : label;
}

function formatBranch(name: string | null, code: string | null): string {
  const label = (name ?? '').trim();
  if (!label && !code) return '-';
  if (label && code) return `${label} (${code})`;
  return label || code || '-';
}

export async function getCashierShortBalanceReportData(query: CashierShortBalanceReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getCashierShortBalanceReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch cashier short balances';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportCashierShortBalanceReportData(
  query: CashierShortBalanceReportQuery
): Promise<{ success: boolean; data?: CashierShortBalanceReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getCashierShortBalanceReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: CashierShortBalanceReportExportRow[] = result.data.map((row) => ({
      account: formatAccount(row.accountName, row.accountCode),
      cashier: formatUserDisplayName(row.cashierName, row.cashierUserId ?? undefined, row.cashierStaffCode),
      branch: formatBranch(row.locationName, row.locationCode),
      cash: formatCents(row.cashCents),
      card: formatCents(row.cardCents),
      slip: formatCents(row.slipCents),
      check: formatCents(row.checkCents),
      credit: formatCents(row.creditCents),
      eWallet: formatCents(row.eWalletCents),
      total: formatCents(row.totalCents)
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.cashier-short-balance.exported',
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
