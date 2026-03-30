'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getAgencyStatementReportService } from '@/services/reports/agency-statement.report.service';
import type { AgencyStatementQuery, AgencyStatementReportData } from '@/types/reports/agency-statement';

export async function getAgencyStatementReportData(
  query: AgencyStatementQuery
): Promise<{ success: boolean; data?: AgencyStatementReportData; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    return await getAgencyStatementReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load agency statement report';
    return { success: false, message: msg };
  }
}
