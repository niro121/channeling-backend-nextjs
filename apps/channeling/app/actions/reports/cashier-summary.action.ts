'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getCashierSummaryReportService } from '@/services/reports/cashier-summary.service';
import type { CashierSummaryReportQuery, CashierSummaryReportResponse } from '@/types/report';

function normalizeUserIds(userIds: CashierSummaryReportQuery['userIds']): string[] | undefined {
  if (!userIds || userIds.length === 0) return undefined;
  const cleaned = [...new Set(userIds.map((id) => id.trim()).filter((id) => id !== '' && id !== '__all__'))];
  return cleaned.length > 0 ? cleaned : undefined;
}

export async function getCashierSummaryReportData(
  query: CashierSummaryReportQuery
): Promise<CashierSummaryReportResponse> {
  await requirePermission('reports', 'view');
  try {
    const userIds = normalizeUserIds(query.userIds);
    return await getCashierSummaryReportService({
      userId: userIds ? undefined : query.userId === '__all__' || !query.userId ? undefined : query.userId,
      userIds,
      locationId: query.locationId === '__all__' || !query.locationId ? undefined : query.locationId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      format: query.format,
    });
  } catch (error: unknown) {
    console.error('getCashierSummaryReportData error', error);
    return {
      success: false,
      sections: [],
      grandTotals: { cash: 0, creditCard: 0, slip: 0, cheque: 0, agent: 0, agentCredit: 0, eWallet: 0 },
      includedShifts: [],
      message: error instanceof Error ? error.message : 'Failed to load cashier summary report',
    };
  }
}
