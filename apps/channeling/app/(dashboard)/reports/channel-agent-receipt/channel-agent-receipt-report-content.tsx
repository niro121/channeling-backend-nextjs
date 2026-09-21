'use client';

import React, { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import Loading from '@/app/(dashboard)/loading';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { formatLKR } from '@/lib/format-money';
import {
  toBrandedPdfSummaryItems,
  type ReportPrintSummaryItem,
} from '@/components/common/report-print';
import { ChannelAgentReceiptReportColumns } from './columns';
import { ChannelAgentReceiptPrintLayout } from './channel-agent-receipt-print-layout';
import { downloadChannelAgentReceiptReportPdf } from './channel-agent-receipt-pdf';
import { downloadChannelAgentReceiptReportExcel } from './channel-agent-receipt-excel';
import { CHANNEL_AGENT_RECEIPT_HEADERS } from './channel-agent-receipt-export-config';
import {
  getChannelAgentReceiptReportData,
  exportChannelAgentReceiptReportData,
} from '@/app/actions/reports/channel-agent-receipt.report.action';
import type {
  ChannelAgentReceiptReportContentProps,
  ChannelAgentReceiptReportExportRow,
  ChannelAgentReceiptReportRow,
} from '@/types/reports/channel-agent-receipt';

function ChannelAgentReceiptReportContentInner({
  currentUserName,
}: ChannelAgentReceiptReportContentProps) {
  const searchParams = useSearchParams();
  const buildQuery = () => ({
    bookNo: searchParams.get('bookNo')?.trim() || undefined,
  });

  const buildSummaryItems = useCallback(
    (values: Record<string, string | undefined>): ReportPrintSummaryItem[] => [
      {
        label: 'Book No',
        value: values.bookNo?.trim() || '—',
      },
    ],
    []
  );

  const handlePdfDownload = useCallback(
    async (args: {
      title: string;
      data: ChannelAgentReceiptReportExportRow[];
      columns: string[];
      keys: (keyof ChannelAgentReceiptReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadChannelAgentReceiptReportPdf({
        reportName: 'Channel Agent Receipt Report',
        summaryItems: toBrandedPdfSummaryItems(
          buildSummaryItems({
            bookNo: searchParams.get('bookNo') ?? '',
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
      data: ChannelAgentReceiptReportExportRow[];
      columns: string[];
      keys: (keyof ChannelAgentReceiptReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadChannelAgentReceiptReportExcel({
        reportName: 'Channel Agent Receipt Report',
        summaryItems: toBrandedPdfSummaryItems(
          buildSummaryItems({
            bookNo: searchParams.get('bookNo') ?? '',
          })
        ),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
        sheetName: (args.title || 'Agent Receipt').slice(0, 31),
      });
    },
    [buildSummaryItems, searchParams]
  );

  return (
    <ReportTemplate<ChannelAgentReceiptReportRow, ChannelAgentReceiptReportExportRow>
      title="Channel Agent Receipt Report"
      description="Search receipts linked to bookings by Book No prefix"
      filterButtonLabel="Search"
      printPageSize="A4 portrait"
      exportOrientation="portrait"
      customDownloadPdf={handlePdfDownload}
      customDownloadExcel={handleExcelDownload}
      containerClassName="container mx-auto py-3 space-y-4 channel-agent-receipt-report-root"
      printSummaryItemsOnly
      renderPrintContent={(rows) => <ChannelAgentReceiptPrintLayout rows={rows} />}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => <>Book No: {values.bookNo?.trim() || '—'}</>,
        formatPrintSummaryItems: (values) => buildSummaryItems(values),
      }}
      filterContent={({ values, setValue }) => (
        <div className="w-full sm:w-[320px]">
          <label className="text-sm text-black font-semibold mb-2 block">Book No.</label>
          <Input
            id="bookNo"
            placeholder="Enter Book No."
            value={values.bookNo ?? ''}
            onChange={(e) => setValue('bookNo', e.target.value || undefined)}
          />
        </div>
      )}
      fetchData={async (params) =>
        getChannelAgentReceiptReportData({
          bookNo: params.get('bookNo')?.trim() || undefined,
        })
      }
      exportData={async () => exportChannelAgentReceiptReportData(buildQuery())}
      columns={ChannelAgentReceiptReportColumns}
      exportColumns={[...CHANNEL_AGENT_RECEIPT_HEADERS]}
      exportKeys={[
        'agentRef',
        'refNo',
        'agency',
        'patient',
        'status',
        'creator',
        'createdDate',
        'billValue',
      ]}
      exportTitle="Channel Agent Receipt Report"
      exportFileName="channel-agent-receipt-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      totalColumnIds={['billValue']}
      formatTotalValue={(columnId, sum) => (columnId === 'billValue' ? formatLKR(sum) : String(sum))}
      emptyMessage="No receipts found. Enter a Book No and click Search."
      skipFetchWhenNoParams={true}
    />
  );
}

export default function ChannelAgentReceiptReportContent(props: ChannelAgentReceiptReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ChannelAgentReceiptReportContentInner {...props} />
    </Suspense>
  );
}
