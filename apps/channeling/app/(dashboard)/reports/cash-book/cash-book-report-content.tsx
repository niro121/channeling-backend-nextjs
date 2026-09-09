'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatCents } from '@/lib/format-money';
import type {
  CashBookReportExportRow,
  CashBookReportQuery,
  CashBookReportRow,
} from '@/types/reports/cash-book';
import {
  exportCashBookReportData,
  getCashBookReportData,
} from '@/app/actions/reports/cash-book.report.action';
import { CashBookReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';

type Props = {
  currentUserName: string;
  cashBookOptions: Array<{ id: string; name: string }>;
};

function todayLocalYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ContentInner({ currentUserName, cashBookOptions }: Props) {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<{
    openingBalanceCents: number;
    closingBalanceCents: number;
  } | null>(null);

  const today = todayLocalYyyyMmDd();
  const defaultFrom = `${today}T00:00`;
  const defaultTo = `${today}T23:59`;
  const defaultCashBookId = '';

  const allCashBooks = useMemo(
    () => cashBookOptions,
    [cashBookOptions]
  );

  const buildQuery = (): CashBookReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? defaultFrom,
    dateTo: searchParams.get('dateTo') ?? defaultTo,
    cashBookAccountId: searchParams.get('cashBookAccountId') ?? defaultCashBookId,
  });

  return (
    <ReportTemplate<CashBookReportRow, CashBookReportExportRow>
      title="Cash Book"
      description="Statement-style view for a selected cash book within a date range."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const from = values.dateFrom ?? '';
          const to = values.dateTo ?? '';
          const accountId = values.cashBookAccountId ?? '';
          const cashBookLabel = allCashBooks.find((x) => x.id === accountId)?.name ?? '-';
          return (
            <>
              <div>Date Range: {from} to {to}</div>
              <div>Cash Book: {cashBookLabel}</div>
            </>
          );
        },
      }}
      initialFilterValues={{
        dateFrom: defaultFrom,
        dateTo: defaultTo,
        cashBookAccountId: defaultCashBookId,
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-2 block text-sm font-semibold">Date range</label>
            <DateTimeRangePicker
              label=""
              from={values.dateFrom}
              to={values.dateTo}
              onChange={({ from, to }) => {
                setValue('dateFrom', from ?? defaultFrom);
                setValue('dateTo', to ?? defaultTo);
              }}
            />
          </div>
          <div className="w-[560px] max-w-full">
            <label className="mb-2 block text-sm font-semibold">Cash Book</label>
            <Combobox
              label="Cash Book"
              options={allCashBooks}
              value={values.cashBookAccountId ?? defaultCashBookId}
              defaultValue={defaultCashBookId}
              clearable
              triggerClassName="w-[760px] max-w-[calc(100vw-140px)]"
              popoverClassName="w-[760px] max-w-[calc(100vw-40px)]"
              onChange={(value) => setValue('cashBookAccountId', value ?? defaultCashBookId)}
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const dateFrom = params.get('dateFrom') ?? defaultFrom;
        const query: CashBookReportQuery = {
          dateFrom,
          dateTo: params.get('dateTo') ?? defaultTo,
          cashBookAccountId: params.get('cashBookAccountId') ?? defaultCashBookId,
        };
        const result = await getCashBookReportData(query);
        if (result.success) {
          setSummary({
            openingBalanceCents: result.openingBalanceCents,
            closingBalanceCents: result.closingBalanceCents,
          });
          const openingRow: CashBookReportRow = {
            id: 'opening-balance-row',
            date: new Date(dateFrom),
            journalNumber: null,
            accountLabel: '-',
            description: 'Opening Balance',
            paymentMethodLabel: '-',
            debitAmount: 0,
            creditAmount: 0,
            runningBalance: result.openingBalanceCents,
          };
          return {
            ...result,
            data: [openingRow, ...result.data],
            totalRecords: result.totalRecords + 1,
          };
        } else {
          setSummary(null);
          return result;
        }
      }}
      exportData={async () => exportCashBookReportData(buildQuery())}
      columns={CashBookReportColumns}
      tableClassName="text-[11px] [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
      exportColumns={['Date', 'Journal #', 'Account', 'Description', 'Type', 'Debit', 'Credit', 'Balance']}
      exportKeys={
        ['date', 'journalNo', 'account', 'description', 'paymentType', 'debit', 'credit', 'balance'] as (keyof CashBookReportExportRow)[]
      }
      exportTitle="Cash Book"
      exportFileName="cash-book"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        if (!summary) return null;
        return (
          <>
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell colSpan={7} className="text-left">
                Closing Balance
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCents(summary.closingBalanceCents)}</TableCell>
            </TableRow>
            {rows.length === 0 && (
              <TableRow className="bg-muted/20">
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No transactions found for the selected range.
                </TableCell>
              </TableRow>
            )}
          </>
        );
      }}
      skipFetchWhenNoParams={true}
      initialEmptyMessage="No cash book statement found. Select filters and click Search."
      emptyMessage="No cash book statement found for the selected filters."
    />
  );
}

export default function CashBookReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
