'use server';

import moment from 'moment';
import { requireReport } from '@/lib/server-permissions';
import { getWithholdingTaxReportService } from '@/services/reports/withholding-tax.report.service';
import type { WithholdingTaxReportExportRow, WithholdingTaxReportQuery } from '@/types/report';

export async function getWithholdingTaxReportData(query: WithholdingTaxReportQuery) {
  await requireReport('withholding-tax');
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
  await requireReport('withholding-tax');
  try {
    const result = await getWithholdingTaxReportService(query);
    if (!result.success || !result.data.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const data: WithholdingTaxReportExportRow[] = result.data.map((row) => ({
      sNo: row.sNo,
      docDate: row.docDate ? moment(row.docDate).format('DD/MM/YYYY HH:mm') : '-',
      docNo: row.docNo ?? '-',
      consultant: row.consultant ?? '-',
      speciality: row.speciality ?? '-',
      tinNumber: row.tinNumber ?? '-',
      nic: row.nic ?? '-',
      address: row.address ?? '-',
      remarks: row.remarks ?? '-',
      totalAmt: row.totalAmt ?? 0,
      taxPercent: row.taxPercent ?? 0,
      holdingTax: row.holdingTax ?? 0,
      netAmt: row.netAmt ?? 0,
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
      tinNumber: '',
      nic: '',
      address: '',
      remarks: '',
      totalAmt,
      taxPercent: null,
      holdingTax,
      netAmt,
    });

    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export withholding tax report';
    return { success: false, message };
  }
}
