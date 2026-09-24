'use server';

import moment from 'moment';
import { requirePermission } from '@/lib/server-permissions';
import { getWithholdingTaxReportService } from '@/services/reports/withholding-tax.report.service';
import type { WithholdingTaxReportExportRow, WithholdingTaxReportQuery } from '@/types/report';

export async function getWithholdingTaxReportData(query: WithholdingTaxReportQuery) {
  await requirePermission('reports', 'view');
  try {
    return await getWithholdingTaxReportService(query);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch withholding tax report';
    return { success: false, data: [], totalRecords: 0, message };
  }
}

export async function exportWithholdingTaxReportData(
  query: WithholdingTaxReportQuery
): Promise<{ success: boolean; data?: WithholdingTaxReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getWithholdingTaxReportService(query);
    if (!result.success || !result.data.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const data: WithholdingTaxReportExportRow[] = result.data.map((row) => ({
      sNo: String(row.sNo ?? '-'),
      docDate: row.docDate ? moment(row.docDate).format('DD/MM/YYYY HH:mm') : '-',
      docNo: row.docNo ?? '-',
      consultant: row.consultant ?? '-',
      speciality: row.speciality ?? '-',
      remarks: row.remarks ?? '-',
      totalAmt: String(row.totalAmt ?? 0),
      taxPercent: String(row.taxPercent ?? 0),
      holdingTax: String(row.holdingTax ?? 0),
      netAmt: String(row.netAmt ?? 0)
    }));

    const totalAmt = result.data.reduce((sum, row) => sum + (Number(row.totalAmt) || 0), 0);
    const holdingTax = result.data.reduce((sum, row) => sum + (Number(row.holdingTax) || 0), 0);
    const netAmt = result.data.reduce((sum, row) => sum + (Number(row.netAmt) || 0), 0);
    data.push({
      sNo: 'Total',
      docDate: '',
      docNo: '',
      consultant: '',
      speciality: '',
      remarks: '',
      totalAmt: String(totalAmt),
      taxPercent: '',
      holdingTax: String(holdingTax),
      netAmt: String(netAmt),
    });

    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export withholding tax report';
    return { success: false, message };
  }
}
