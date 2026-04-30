'use client';

import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  CardSummaryBankWiseReportExportRow,
  CardSummaryBankWiseReportFormat,
  CardSummaryBankWiseReportQuery,
  CardSummaryBankWiseReportRow
} from '@/types/reports/card-summary-bank-wise';
import { exportCardSummaryBankWiseReportData, getCardSummaryBankWiseReportData } from '@/app/actions/reports/card-summary-bank-wise.report.action';
import { CardSummaryBankWiseDetailColumns, CardSummaryBankWiseSummaryColumns } from './columns';

type Props = {
  currentUserName: string;
  bankOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
};

function getDefaultDateTimeRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-${d}T00:00`,
    dateTo: `${y}-${m}-${d}T23:59`
  };
}

function ContentInner({ currentUserName, bankOptions, locationOptions }: Props) {
  const searchParams = useSearchParams();

  const format = (searchParams.get('format') as CardSummaryBankWiseReportFormat) ?? 'summary';
  const columns = useMemo(
    () => (format === 'detail' ? CardSummaryBankWiseDetailColumns : CardSummaryBankWiseSummaryColumns),
    [format]
  );

  const exportColumns = useMemo(() => {
    return format === 'detail'
      ? ['Receipt No.', 'Remark', 'User Location', 'User', 'Created Date and Time', 'Bank', 'Card No', 'Total']
      : ['Bank Name', 'Count', 'Total'];
  }, [format]);

  const exportKeys = useMemo(() => {
    return (
      format === 'detail'
        ? (['receiptNo', 'remarks', 'userLocation', 'user', 'createdAt', 'bank', 'cardReference', 'total'] as (keyof CardSummaryBankWiseReportExportRow)[])
        : (['bank', 'count', 'total'] as (keyof CardSummaryBankWiseReportExportRow)[])
    );
  }, [format]);

  const buildQuery = (): CardSummaryBankWiseReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    bankId: searchParams.get('bankId') ?? '__all__',
    locationId: searchParams.get('locationId') ?? '__all__',
    format
  });

  return (
    <ReportTemplate<CardSummaryBankWiseReportRow, CardSummaryBankWiseReportExportRow>
      title="Card Summary - Bank Wise"
      description="Lists card movements by bank, including collections and refunds. Use Summary for bank totals, or Detail for receipt-level records."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const df = values.dateFrom ?? '';
          const dt = values.dateTo ?? '';
          const bankId = values.bankId ?? '__all__';
          const locId = values.locationId ?? '__all__';
          const fmt = (values.format ?? 'summary') as string;
          const bankLabel = bankId === '__all__' ? 'All Banks' : bankOptions.find((b) => b.id === bankId)?.name ?? bankId;
          const locLabel = locId === '__all__' ? 'All Branches' : locationOptions.find((l) => l.id === locId)?.name ?? locId;
          const fmtLabel = fmt === 'detail' ? 'Detail' : 'Summary';
          return (
            <>
              <div>Range: {df} to {dt}</div>
              <div>Bank: {bankLabel} | Branch: {locLabel} | Format: {fmtLabel}</div>
            </>
          );
        }
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-shrink-0">
            <DateTimeRangePicker
              label="Date & time range"
              from={values.dateFrom}
              to={values.dateTo}
              onChange={({ from, to }) => {
                setValue('dateFrom', from);
                setValue('dateTo', to);
              }}
            />
          </div>

          <div className="w-[240px]">
            <label className="text-sm font-semibold mb-2 block">Bank</label>
            <Combobox
              label="Bank"
              options={bankOptions}
              value={values.bankId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('bankId', v ?? '__all__')}
            />
          </div>

          <div className="w-[240px]">
            <label className="text-sm font-semibold mb-2 block">Branch</label>
            <Combobox
              label="Branch"
              options={locationOptions}
              value={values.locationId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('locationId', v ?? '__all__')}
            />
          </div>

          <div className="w-[200px]">
            <label className="text-sm font-semibold mb-2 block">Format</label>
            <Combobox
              label="Format"
              options={[
                { id: 'summary', name: 'Summary' },
                { id: 'detail', name: 'Detail' }
              ]}
              value={values.format ?? 'summary'}
              defaultValue="summary"
              clearable={false}
              onChange={(v) => setValue('format', (v as string) || 'summary')}
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const query: CardSummaryBankWiseReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          bankId: params.get('bankId') ?? '__all__',
          locationId: params.get('locationId') ?? '__all__',
          format: (params.get('format') as CardSummaryBankWiseReportFormat) ?? 'summary'
        };
        return getCardSummaryBankWiseReportData(query);
      }}
      exportData={async () => exportCardSummaryBankWiseReportData(buildQuery())}
      columns={columns}
      exportColumns={exportColumns}
      exportKeys={exportKeys}
      exportTitle="Card Summary - Bank Wise"
      exportFileName="card-summary-bank-wise"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        const totalCount = rows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
        const totalAmount = rows.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
        return format === 'detail' ? (
          <TableRow className="font-medium bg-muted/50">
            <TableCell colSpan={7} className="text-left">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {formatReceiptAmount(totalAmount)}
            </TableCell>
          </TableRow>
        ) : (
          <TableRow className="font-medium bg-muted/50">
            <TableCell className="text-left">Total</TableCell>
            <TableCell className="text-right tabular-nums">{String(totalCount)}</TableCell>
            <TableCell className="text-right tabular-nums font-semibold">{formatReceiptAmount(totalAmount)}</TableCell>
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={getDefaultDateTimeRange()}
      initialEmptyMessage="No card movements found. Select filters and click Search."
      emptyMessage="No card movements found for the selected filters."
    />
  );
}

export default function CardSummaryBankWiseReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}

