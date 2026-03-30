'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import Loading from '@/app/(dashboard)/loading';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { ChannelAgentReceiptReportColumns } from './columns';
import {
  getChannelAgentReceiptReportData,
  exportChannelAgentReceiptReportData,
} from '@/app/actions/reports/channel-agent-receipt.report.action';
import type {
  ChannelAgentReceiptReportContentProps,
  ChannelAgentReceiptReportExportRow,
  ChannelAgentReceiptReportRow,
} from '@/types/reports/channel-agent-receipt';

function ChannelAgentReceiptReportContentInner(_props: ChannelAgentReceiptReportContentProps) {
  const searchParams = useSearchParams();
  const buildQuery = () => ({
    bookNo: searchParams.get('bookNo')?.trim() || undefined,
  });

  return (
    <ReportTemplate<ChannelAgentReceiptReportRow, ChannelAgentReceiptReportExportRow>
      title="Channel Agent Receipt Report"
      description="Search receipts linked to bookings by Book No prefix"
      filterButtonLabel="Search"
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
      exportColumns={['Agent Reference', 'Receipt No', 'Agency', 'Patient', 'Status', 'Creator', 'Created Date', 'Bill Value']}
      exportKeys={['agentRef', 'refNo', 'agency', 'patient', 'status', 'creator', 'createdDate', 'billValue']}
      exportTitle="Channel Agent Receipt Report"
      exportFileName="channel-agent-receipt-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
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
