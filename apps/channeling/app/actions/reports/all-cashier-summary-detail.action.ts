'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getAllCashierSummaryDetailReportService } from '@/services/reports/all-cashier-summary-detail.service';
import type { AllCashierSummaryDetailReportQuery, AllCashierSummaryDetailReportResponse } from '@/types/report';

const ZERO_AMOUNTS = {
  cash: 0,
  creditCard: 0,
  slip: 0,
  cheque: 0,
  agent: 0,
  agentCredit: 0,
  eWallet: 0,
};

export async function getAllCashierSummaryDetailReportData(
  query: AllCashierSummaryDetailReportQuery
): Promise<AllCashierSummaryDetailReportResponse> {
  await requirePermission('reports', 'view');
  try {
    return await getAllCashierSummaryDetailReportService({
      userId: query.userId === '__all__' || !query.userId ? undefined : query.userId,
      locationId: query.locationId === '__all__' || !query.locationId ? undefined : query.locationId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      format: query.format,
    });
  } catch (error: unknown) {
    console.error('getAllCashierSummaryDetailReportData error', error);
    return {
      success: false,
      summaryRows: [],
      detailRows: [],
      grandTotals: ZERO_AMOUNTS,
      totalReceipts: 0,
      message: error instanceof Error ? error.message : 'Failed to load all cashier summary/detail report',
    };
  }
}
