'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
import { Input } from '@/components/ui/input';
import {
  exportDailyReturnsSummaryReportData,
  getDailyReturnsSummaryReportData,
} from '@/app/actions/reports/daily-returns-summary.report.action';
import type {
  DailyReturnsSummaryReportExportRow,
  DailyReturnsSummaryReportQuery,
  DailyReturnsSummaryReportRow,
} from '@/types/reports/daily-returns-summary';
import { DailyReturnsSummaryReportColumns } from './columns';

type Props = {
  currentUserName: string;
  locationOptions: Array<{ id: string; name: string }>;
};

function todayLocalYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyReturnsSummaryReportContent({ currentUserName, locationOptions }: Props) {
  const searchParams = useSearchParams();
  const defaultDate = todayLocalYyyyMmDd();

  const buildQuery = (): DailyReturnsSummaryReportQuery => ({
    reportDate: searchParams.get('reportDate') ?? defaultDate,
    locationId: searchParams.get('locationId') ?? '__all__',
  });

  return (
    <ReportTemplate<DailyReturnsSummaryReportRow, DailyReturnsSummaryReportExportRow>
      title="Daily Returns Summary"
      description="Receipt-based summary of daily cash float by receipt type (Settlement, Refund, Doctor Payment, Agency Deposit, Branch Income, Bank Deposit, etc.). Agency debit/credit notes are excluded."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
      initialFilterValues={{ reportDate: defaultDate, locationId: '__all__' }}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const locId = values.locationId ?? '__all__';
          const locLabel =
            locId === '__all__'
              ? 'All Branches'
              : (locationOptions.find((l) => l.id === locId)?.name ?? locId);
          return (
            <>
              <div>Date: {values.reportDate ?? ''}</div>
              <div>Branch: {locLabel}</div>
            </>
          );
        },
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[200px]">
            <label className="text-sm font-semibold mb-2 block">Date</label>
            <Input
              type="date"
              value={values.reportDate ?? defaultDate}
              onChange={(e) => setValue('reportDate', e.target.value)}
              className="h-10 w-full py-0"
            />
          </div>
          <div className="w-[260px]">
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
        </div>
      )}
      fetchData={async (params) => {
        const query: DailyReturnsSummaryReportQuery = {
          reportDate: params.get('reportDate') ?? defaultDate,
          locationId: params.get('locationId') ?? '__all__',
        };
        return getDailyReturnsSummaryReportData(query);
      }}
      exportData={async () => exportDailyReturnsSummaryReportData(buildQuery())}
      columns={DailyReturnsSummaryReportColumns}
      exportColumns={[
        'Receipt Type',
        'Count',
        'Cash',
        'Credit Card',
        'Slip',
        'Cheque',
        'E-Wallet',
        'Float Total',
        'Agent',
        'Credit',
      ]}
      exportKeys={
        [
          'method',
          'count',
          'cash',
          'creditCard',
          'slip',
          'cheque',
          'eWallet',
          'floatTotal',
          'agent',
          'credit',
        ] as (keyof DailyReturnsSummaryReportExportRow)[]
      }
      exportTitle="Daily Returns Summary"
      exportFileName="daily-returns-summary"
      getRowId={(row) => String(row.key)}
      totalColumnIds={['count', 'cash', 'creditCard', 'slip', 'cheque', 'eWallet', 'floatTotal', 'agent', 'credit']}
      totalRowLabel="Sub Total"
      formatTotalValue={(columnId, sum) => {
        if (columnId === 'count') {
          return <span className="text-center tabular-nums block w-full">{sum.toLocaleString()}</span>;
        }
        if (columnId === 'floatTotal') {
          return <span className="block w-full text-right tabular-nums font-bold">{money(sum)}</span>;
        }
        return <span className="text-right tabular-nums block w-full">{money(sum)}</span>;
      }}
      skipFetchWhenNoParams={true}
      initialEmptyMessage="No daily returns summary found. Select a date and branch, then click Search."
      emptyMessage="No daily returns summary found for the selected filters."
    />
  );
}
