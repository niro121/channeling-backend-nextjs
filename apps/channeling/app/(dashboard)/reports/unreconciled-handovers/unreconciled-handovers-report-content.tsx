'use client';

import React, { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Selector } from '@/components/common/selector';
import { ReportUserSelect } from '@/components/common/user-select';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { toBrandedPdfSummaryItems } from '@/components/common/report-print';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
import { formatCents } from '@/lib/format-money';
import {
  UNRECONCILED_PAYMENT_TYPE_OPTIONS,
  unreconciledPaymentTypeLabel,
  type UnreconciledHandoversReportExportRow,
  type UnreconciledHandoversReportQuery,
  type UnreconciledHandoversReportRow,
} from '@/types/reports/unreconciled-handovers';
import {
  exportUnreconciledHandoversReportData,
  getUnreconciledHandoversReportData,
} from '@/app/actions/reports/unreconciled-handovers.report.action';
import { UnreconciledHandoversColumns } from './columns';
import { UnreconciledHandoversPrintLayout } from './unreconciled-handovers-print-layout';
import { downloadUnreconciledHandoversReportPdf } from './unreconciled-handovers-pdf';
import { downloadUnreconciledHandoversReportExcel } from './unreconciled-handovers-excel';

type Props = {
  currentUserName: string;
  userOptions: Array<{ id: string; name: string }>;
};

function ContentInner({ currentUserName, userOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): UnreconciledHandoversReportQuery => ({
    userId: searchParams.get('userId') ?? '',
    paymentMethod: searchParams.get('paymentMethod') ?? '__all__',
  });

  const buildSummaryItems = useCallback(
    (values: Record<string, string | undefined>): ReportPrintSummaryItem[] => {
      const userId = values.userId ?? '';
      const userName = userOptions.find((user) => user.id === userId)?.name ?? '—';
      return [
        { label: 'User', value: userName },
        { label: 'Payment type', value: unreconciledPaymentTypeLabel(values.paymentMethod) },
      ];
    },
    [userOptions]
  );

  const handlePdfDownload = useCallback(
    async (args: {
      title: string;
      data: UnreconciledHandoversReportExportRow[];
      columns: string[];
      keys: (keyof UnreconciledHandoversReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadUnreconciledHandoversReportPdf({
        reportName: 'Unreconciled Handover Balance',
        summaryItems: toBrandedPdfSummaryItems(
          buildSummaryItems({
            userId: searchParams.get('userId') ?? '',
            paymentMethod: searchParams.get('paymentMethod') ?? '__all__',
          })
        ),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
      });
    },
    [buildSummaryItems, searchParams]
  );

  const handleExcelDownload = useCallback(
    async (args: {
      title: string;
      data: UnreconciledHandoversReportExportRow[];
      columns: string[];
      keys: (keyof UnreconciledHandoversReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadUnreconciledHandoversReportExcel({
        reportName: 'Unreconciled Handover Balance',
        summaryItems: toBrandedPdfSummaryItems(
          buildSummaryItems({
            userId: searchParams.get('userId') ?? '',
            paymentMethod: searchParams.get('paymentMethod') ?? '__all__',
          })
        ),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
      });
    },
    [buildSummaryItems, searchParams]
  );

  return (
    <ReportTemplate<UnreconciledHandoversReportRow, UnreconciledHandoversReportExportRow>
      title="Unreconciled Handover Balance"
      description="For one bulk cashier, lists handover receipt lines that were never deducted from the till and compares those totals with the current till balance by payment method."
      filterButtonLabel="Search"
      showBackButton={false}
      printPageSize="A4 landscape"
      exportOrientation="landscape"
      containerClassName="w-full py-2 space-y-3"
      renderPrintContent={(rows) => <UnreconciledHandoversPrintLayout rows={rows} />}
      customDownloadPdf={handlePdfDownload}
      customDownloadExcel={handleExcelDownload}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const userId = values.userId ?? '';
          const userName = userOptions.find((user) => user.id === userId)?.name ?? '—';
          return (
            <div>
              User: {userName} | Payment type: {unreconciledPaymentTypeLabel(values.paymentMethod)}
            </div>
          );
        },
        formatPrintSummaryItems: (values) => buildSummaryItems(values),
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <ReportUserSelect
            userOptions={userOptions}
            value={values.userId ?? ''}
            onChange={(value) => setValue('userId', value)}
            label="Bulk cashier"
            placeholder="Select user"
            includeAllUsers={false}
            widthClassName="w-[280px]"
          />
          <div className="flex-shrink-0">
            <label className="text-sm font-semibold mb-2 block">Payment type</label>
            <Selector
              label="All payment types"
              options={[...UNRECONCILED_PAYMENT_TYPE_OPTIONS]}
              value={values.paymentMethod}
              onChange={(value) => setValue('paymentMethod', value)}
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const query: UnreconciledHandoversReportQuery = {
          userId: params.get('userId') ?? '',
          paymentMethod: params.get('paymentMethod') ?? '__all__',
        };
        return getUnreconciledHandoversReportData(query);
      }}
      exportData={async () => exportUnreconciledHandoversReportData(buildQuery())}
      columns={UnreconciledHandoversColumns}
      exportColumns={['Method', 'Not deducted', 'Till balance', 'Difference', 'Why']}
      exportKeys={['method', 'notDeducted', 'tillBalance', 'difference', 'why']}
      exportTitle="Unreconciled Handover Balance"
      exportFileName="unreconciled-handover-balance"
      getRowId={(row) => row.id}
      groupBy={(row) => row.groupKey}
      renderGroupHeader={(_key, groupRows) => groupRows[0]?.groupLabel ?? ''}
      footerRow={(rows) => {
        const total = rows
          .filter((row) => row.rowKind === 'item')
          .reduce((sum, row) => sum + (row.amountCents ?? 0), 0);
        return (
          <TableRow className="font-semibold bg-muted/50">
            <TableCell colSpan={4}>Grand total not deducted</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(total)}</TableCell>
            <TableCell colSpan={3} />
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={{ userId: '', paymentMethod: '__all__' }}
      initialEmptyMessage="Select a user and click Search."
      emptyMessage="No till or unreconciled handover lines for this user."
    />
  );
}

export default function UnreconciledHandoversReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
