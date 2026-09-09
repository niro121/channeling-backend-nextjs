'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getNoShowPatientReportService } from '@/services/reports/no-show-patient.report.service';
import type {
  NoShowPatientReportExportRow,
  NoShowPatientReportQuery,
  NoShowPatientReportResult,
} from '@/types/reports/no-show-patient';

export async function getNoShowPatientReportData(
  query: NoShowPatientReportQuery
): Promise<NoShowPatientReportResult> {
  await requirePermission('reports', 'view');
  try {
    return await getNoShowPatientReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch no show patient report';
    return { success: false, message: msg };
  }
}

export async function exportNoShowPatientReportData(
  query: NoShowPatientReportQuery
): Promise<{
  success: boolean;
  data?: NoShowPatientReportExportRow[];
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const result = await getNoShowPatientReportService(query);
    if (!result.success || !result.data || !result.periodKeys || !result.columnTotals) {
      return { success: false, message: result.message || 'No data available' };
    }

    const periodKeys = result.periodKeys;
    const rows: NoShowPatientReportExportRow[] = result.data.map((row) => {
      const base: NoShowPatientReportExportRow = {
        speciality: row.speciality,
        doctorName: row.doctorName,
        total: String(row.total),
      };
      for (const key of periodKeys) {
        base[result.periodLabels?.[key] ?? key] = String(row.periodCounts[key] ?? 0);
      }
      return base;
    });

    const totalRow: NoShowPatientReportExportRow = {
      speciality: '',
      doctorName: 'Total',
      total: String(result.grandTotal ?? 0),
    };
    for (const key of periodKeys) {
      totalRow[result.periodLabels?.[key] ?? key] = String(result.columnTotals[key] ?? 0);
    }
    rows.push(totalRow);

    return { success: true, data: rows };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export no show patient report';
    return { success: false, message: msg };
  }
}
