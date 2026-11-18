'use client';

import { downloadBrandedReportExcel, type BrandedPdfSummaryItem } from '@/components/common/report-print';
import type { UnreconciledHandoversReportExportRow } from '@/types/reports/unreconciled-handovers';
import {
  BALANCE_COLUMNS,
  DETAIL_COLUMNS,
  unreconciledBalanceBody,
  unreconciledDetailBody,
} from './unreconciled-handovers-sections';

const MONEY = '#,##0.00';

export async function downloadUnreconciledHandoversReportExcel(args: {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: UnreconciledHandoversReportExportRow[];
  fileName?: string;
}) {
  await downloadBrandedReportExcel({
    reportName: args.reportName,
    summaryItems: args.summaryItems,
    generatedAt: args.generatedAt,
    orientation: 'landscape',
    fileName: args.fileName ?? 'unreconciled-handover-balance.xlsx',
    sheetName: 'Unreconciled handovers',
    sections: [
      {
        title:
          args.rows.find((row) => row.rowKind === 'balance')?.groupLabel ||
          'Till compared with amounts not yet deducted',
        columns: BALANCE_COLUMNS,
        body: unreconciledBalanceBody(args.rows),
        numberFormats: [undefined, MONEY, MONEY, MONEY, undefined],
      },
      {
        title: 'Undeducted handover lines',
        columns: DETAIL_COLUMNS,
        body: unreconciledDetailBody(args.rows),
        numberFormats: [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          MONEY,
          undefined,
        ],
      },
    ],
  });
}
