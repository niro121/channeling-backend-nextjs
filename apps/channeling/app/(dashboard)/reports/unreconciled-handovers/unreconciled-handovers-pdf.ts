'use client';

import { downloadBrandedReportPdf, type BrandedPdfSummaryItem } from '@/components/common/report-print';
import type { UnreconciledHandoversReportExportRow } from '@/types/reports/unreconciled-handovers';
import {
  BALANCE_COLUMNS,
  DETAIL_COLUMNS,
  unreconciledBalanceBody,
  unreconciledDetailBody,
} from './unreconciled-handovers-sections';

export async function downloadUnreconciledHandoversReportPdf(args: {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: UnreconciledHandoversReportExportRow[];
  fileName?: string;
}) {
  await downloadBrandedReportPdf({
    reportName: args.reportName,
    summaryItems: args.summaryItems,
    generatedAt: args.generatedAt,
    orientation: 'landscape',
    compactTable: true,
    fileName: args.fileName ?? 'unreconciled-handover-balance.pdf',
    sections: [
      {
        title:
          args.rows.find((row) => row.rowKind === 'balance')?.groupLabel ||
          'Till compared with amounts not yet deducted',
        columns: BALANCE_COLUMNS,
        body: unreconciledBalanceBody(args.rows),
      },
      {
        title: 'Undeducted handover lines',
        columns: DETAIL_COLUMNS,
        body: unreconciledDetailBody(args.rows),
      },
    ],
  });
}
