'use client';

import React, { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { toBrandedPdfSummaryItems } from '@/components/common/report-print';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
import { formatCents } from '@/lib/format-money';
import type {
  CashierShortBalanceReportExportRow,
  CashierShortBalanceReportQuery,
  CashierShortBalanceReportRow
} from '@/types/reports/cashier-short-balance';
import {
  exportCashierShortBalanceReportData,
  getCashierShortBalanceReportData
} from '@/app/actions/reports/cashier-short-balance.report.action';
import { CashierShortBalanceReportColumns } from './columns';
import { CashierShortBalancePrintLayout } from './cashier-short-balance-print-layout';
import { downloadCashierShortBalanceReportExcel } from './cashier-short-balance-excel';

type Props = {
  currentUserName: string;
  locationOptions: Array<{ id: string; name: string }>;
};

function todayLocalEndOfDayYyyyMmDdHhMm(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}T23:59`;
}

const EMPTY_TOTALS = {
  cashCents: 0,
  cardCents: 0,
  creditCents: 0,
  slipCents: 0,
  checkCents: 0,
  eWalletCents: 0,
  totalCents: 0
};

function sumRows(rows: CashierShortBalanceReportRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.cashCents += row.cashCents;
      acc.cardCents += row.cardCents;
      acc.creditCents += row.creditCents;
      acc.slipCents += row.slipCents;
      acc.checkCents += row.checkCents;
      acc.eWalletCents += row.eWalletCents;
      acc.totalCents += row.totalCents;
      return acc;
    },
    { ...EMPTY_TOTALS }
  );
}

export default function CashierShortBalanceReportContent({ currentUserName, locationOptions }: Props) {
  const searchParams = useSearchParams();
  const defaultAsOf = todayLocalEndOfDayYyyyMmDdHhMm();

  const buildQuery = useCallback((): CashierShortBalanceReportQuery => ({
    asOfDateTime: searchParams.get('asOfDateTime') ?? defaultAsOf,
    locationId: searchParams.get('locationId') ?? '__all__'
  }), [searchParams, defaultAsOf]);

  const buildSummaryItems = useCallback(
    (values: Record<string, string | undefined>): ReportPrintSummaryItem[] => {
      const locId = values.locationId ?? '__all__';
      return [
        { label: 'As of', value: values.asOfDateTime ?? '—', fullWidth: true },
        {
          label: 'Branch',
          value:
            locId === '__all__'
              ? 'All Branches'
              : (locationOptions.find((l) => l.id === locId)?.name ?? locId),
        },
      ];
    },
    [locationOptions]
  );

  const handleExcelDownload = useCallback(
    async (args: {
      title: string;
      data: CashierShortBalanceReportExportRow[];
      columns: string[];
      keys: (keyof CashierShortBalanceReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadCashierShortBalanceReportExcel({
        reportName: 'Cashier Short Balance',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(buildQuery())),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
        sheetName: 'Short Balance',
      });
    },
    [buildSummaryItems, buildQuery]
  );

  return (
    <ReportTemplate<CashierShortBalanceReportRow, CashierShortBalanceReportExportRow>
      title="Cashier Short Balance"
      description="Shows each cashier's short account balance by payment method as of the selected date/time, with optional branch filter."
      filterButtonLabel="Search"
      showBackButton={false}
      printPageSize="A4 portrait"
      printPageMargins="7mm 5mm 18mm"
      pdfPageMarginMm={5}
      exportOrientation="portrait"
      containerClassName="w-full py-2 space-y-3 cashier-short-balance-report-root"
      renderPrintContent={(rows) => <CashierShortBalancePrintLayout rows={rows} />}
      customDownloadExcel={handleExcelDownload}
      initialFilterValues={{ asOfDateTime: defaultAsOf, locationId: '__all__' }}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const locId = values.locationId ?? '__all__';
          const locLabel = locId === '__all__'
            ? 'All Branches'
            : (locationOptions.find((l) => l.id === locId)?.name ?? locId);
          return (
            <>
              <div>As of: {values.asOfDateTime ?? ''}</div>
              <div>Branch: {locLabel}</div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => buildSummaryItems(values),
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[320px]">
            <label className="text-sm font-semibold mb-2 block">As-of Date & Time</label>
            <Input
              type="datetime-local"
              value={values.asOfDateTime ?? defaultAsOf}
              onChange={(e) => setValue('asOfDateTime', e.target.value)}
              className="h-10 w-full py-0"
              step="60"
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
        const query: CashierShortBalanceReportQuery = {
          asOfDateTime: params.get('asOfDateTime') ?? defaultAsOf,
          locationId: params.get('locationId') ?? '__all__'
        };
        return getCashierShortBalanceReportData(query);
      }}
      exportData={async () => exportCashierShortBalanceReportData(buildQuery())}
      columns={CashierShortBalanceReportColumns}
      exportColumns={['Account', 'Cashier', 'Branch', 'Cash', 'Card', 'Credit', 'Slip', 'Cheque', 'E-Wallet', 'Total']}
      exportKeys={
        ['account', 'cashier', 'branch', 'cash', 'card', 'credit', 'slip', 'check', 'eWallet', 'total'] as (keyof CashierShortBalanceReportExportRow)[]
      }
      exportTitle="Cashier Short Balance"
      exportFileName="cashier-short-balance"
      getRowId={(row) => row.accountId}
      footerRow={(rows) => {
        const totals = sumRows(rows);
        return (
          <TableRow className="font-medium bg-muted/50">
            <TableCell colSpan={3} className="text-left">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(totals.cashCents)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(totals.cardCents)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(totals.creditCents)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(totals.slipCents)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(totals.checkCents)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(totals.eWalletCents)}</TableCell>
            <TableCell className="text-right tabular-nums font-semibold">{formatCents(totals.totalCents)}</TableCell>
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialEmptyMessage="No short balances found. Select date/time and branch, then click Search."
      emptyMessage="No short balances found for the selected filters."
    />
  );
}
