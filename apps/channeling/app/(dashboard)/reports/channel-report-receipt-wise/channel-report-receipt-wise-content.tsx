'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Input } from '@/components/ui/input';
import Loading from '@/app/(dashboard)/loading';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { formatLKR } from '@/lib/format-money';
import { ChannelReportReceiptWiseColumns } from './columns';
import {
  getChannelReportReceiptWiseData,
  exportChannelReportReceiptWiseData,
} from '@/app/actions/reports/channel-report-receipt-wise.report.action';
import type {
  ChannelReportReceiptWiseContentProps,
  ChannelReportReceiptWiseExportRow,
  ChannelReportReceiptWiseRow,
} from '@/types/reports/channel-report-receipt-wise';
import { RECEIPT_CATEGORY_OPTIONS } from '@/types/reports/channel-report-receipt-wise';

function getDefaultDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}T00:00`, to: `${y}-${m}-${d}T23:59` };
}

function ChannelReportReceiptWiseContentInner(props: ChannelReportReceiptWiseContentProps) {
  const searchParams = useSearchParams();

  const initialFilterValues = React.useMemo(() => {
    const { from, to } = getDefaultDateTimeRange();
    return { fromDateTime: from, toDateTime: to, receiptCategory: '__all__' };
  }, []);

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    receiptNo: searchParams.get('receiptNo')?.trim() || undefined,
    receiptCategory: searchParams.get('receiptCategory') ?? undefined,
  });

  return (
    <ReportTemplate<ChannelReportReceiptWiseRow, ChannelReportReceiptWiseExportRow>
      title="Receipt Report"
      description="Shows all receipts by created date/time range. Filter by receipt type as needed."
      filterButtonLabel="Search"
      initialFilterValues={initialFilterValues}
      skipFetchWhenNoParams={true}
      initialEmptyMessage="No receipts found. Select filters and click Search."
      emptyMessage="No receipts found for the selected filters."
      generationDetails={{
        generatedBy: props.currentUserName,
        formatFilters: (values) => (
          <>
            <div>
              Range: {values.fromDateTime || '—'} to {values.toDateTime || '—'}
            </div>
            <div>
              Category: {RECEIPT_CATEGORY_OPTIONS.find((x) => x.id === (values.receiptCategory ?? '__all__'))?.name ?? 'All Categories'}
            </div>
            <div>Receipt no: {values.receiptNo?.trim() || 'All'}</div>
          </>
        ),
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap gap-4 items-end">
          <DateTimeRangePicker
            label="Date & Time Range"
            from={values.fromDateTime}
            to={values.toDateTime}
            onChange={({ from, to }) => {
              setValue('fromDateTime', from);
              setValue('toDateTime', to);
            }}
          />
          <div className="w-full sm:w-[300px]">
            <Selector
              label="Receipt Category"
              options={RECEIPT_CATEGORY_OPTIONS}
              value={values.receiptCategory ?? '__all__'}
              onChange={(v) => setValue('receiptCategory', v)}
            />
          </div>
          <div className="w-full sm:w-[260px]">
            <label className="text-sm text-black font-semibold mb-2 block">Receipt No</label>
            <Input
              placeholder="Enter receipt no"
              value={values.receiptNo ?? ''}
              onChange={(e) => setValue('receiptNo', e.target.value || undefined)}
            />
          </div>
        </div>
      )}
      fetchData={async (params) =>
        getChannelReportReceiptWiseData({
          fromDateTime: params.get('fromDateTime') ?? undefined,
          toDateTime: params.get('toDateTime') ?? undefined,
          receiptNo: params.get('receiptNo')?.trim() || undefined,
          receiptCategory: params.get('receiptCategory') ?? undefined,
        })
      }
      exportData={async () => exportChannelReportReceiptWiseData(buildQuery())}
      columns={ChannelReportReceiptWiseColumns}
      exportColumns={[
        'Type',
        'Receipt No',
        'Receipt Date',
        'Payment Method',
        'Transaction Type',
        'Cancel Reason',
        'Reversed Receipt',
        'Amount',
        'WHT',
        'Net Amount',
        'App No',
        'Session Date',
        'Session Time',
        'Consultant',
        'Patient',
        'Booking Status',
        'Agency',
        'Credit Customer',
        'Creator',
        'Handover Person',
      ]}
      exportKeys={[
        'receiptScope',
        'receiptNo',
        'receiptDate',
        'receiptMethod',
        'transactionType',
        'cancelReason',
        'reversedReceiptNo',
        'receiptAmount',
        'whdAmount',
        'netAmount',
        'appointmentNo',
        'sessionDate',
        'sessionTime',
        'consultant',
        'patientName',
        'bookingStatus',
        'agency',
        'creditCustomer',
        'creator',
        'handoverPerson',
      ]}
      exportTitle="Receipt Report"
      exportFileName="receipt-report"
      getRowId={(row) => row.id}
      totalColumnIds={['receiptAmount', 'whdAmount', 'netAmount']}
      formatTotalValue={(_columnId, sum) => formatLKR(sum)}
      tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
    />
  );
}

export default function ChannelReportReceiptWiseContent(props: ChannelReportReceiptWiseContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ChannelReportReceiptWiseContentInner {...props} />
    </Suspense>
  );
}
