'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getCashierSummaryReportService } from '@/services/reports/cashier-summary.service';
import type { CashierSummaryReportQuery, CashierSummaryReportResponse } from '@/types/report';

export async function getCashierSummaryReportData(
  query: CashierSummaryReportQuery
): Promise<CashierSummaryReportResponse> {
  await requirePermission('reports', 'view');
  try {
    return await getCashierSummaryReportService({
      userId: query.userId === '__all__' || !query.userId ? undefined : query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      format: query.format,
    });
  } catch (error: unknown) {
    console.error('getCashierSummaryReportData error', error);
    return {
      success: false,
      sections: [],
      grandTotals: { cash: 0, creditCard: 0, slip: 0, cheque: 0, agent: 0, agentCredit: 0 },
      message: error instanceof Error ? error.message : 'Failed to load cashier summary report',
    };
  }
}
