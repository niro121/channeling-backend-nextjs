'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatCents } from '@/lib/format-money';
import type {
  CashierDrawerBalanceReportExportRow,
  CashierDrawerBalanceReportQuery,
  CashierDrawerBalanceReportRow
} from '@/types/reports/cashier-drawer-balance';
import {
  exportCashierDrawerBalanceReportData,
  getCashierDrawerBalanceReportData
} from '@/app/actions/reports/cashier-drawer-balance.report.action';
import { CashierDrawerBalanceReportColumns } from './columns';

type Props = { currentUserName: string };

function todayLocalYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CashierDrawerBalanceReportContent({ currentUserName }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): CashierDrawerBalanceReportQuery => ({
    date: searchParams.get('date') ?? ''
  });

  return (
    <ReportTemplate<CashierDrawerBalanceReportRow, CashierDrawerBalanceReportExportRow>
      title="Cashier Drawer Balance"
      description="Shows till balances by payment method as of the selected date (end of day)."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      initialFilterValues={{ date: todayLocalYyyyMmDd() }}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => <div>Date: {values.date ?? ''}</div>
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[200px]">
            <label className="text-sm font-semibold mb-2 block">Date</label>
            <Input
              type="date"
              value={values.date ?? ''}
              onChange={(e) => setValue('date', e.target.value)}
              className="h-10 w-full py-0"
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const query: CashierDrawerBalanceReportQuery = { date: params.get('date') ?? '' };
        return getCashierDrawerBalanceReportData(query);
      }}
      exportData={async () => exportCashierDrawerBalanceReportData(buildQuery())}
      columns={CashierDrawerBalanceReportColumns}
      exportColumns={['Till', 'Cashier', 'Cash', 'Card', 'Credit', 'Slip', 'Check', 'E-Wallet', 'Total']}
      exportKeys={
        ['till', 'cashier', 'cash', 'card', 'credit', 'slip', 'check', 'eWallet', 'total'] as (keyof CashierDrawerBalanceReportExportRow)[]
      }
      exportTitle="Cashier Drawer Balance"
      exportFileName="cashier-drawer-balance"
      getRowId={(row) => row.tillAccountId}
      footerRow={(rows) => {
        const totals = rows.reduce(
          (acc, r) => {
            acc.cashCents += r.cashCents;
            acc.cardCents += r.cardCents;
            acc.creditCents += r.creditCents;
            acc.slipCents += r.slipCents;
            acc.checkCents += r.checkCents;
            acc.eWalletCents += r.eWalletCents;
            acc.totalCents += r.totalCents;
            return acc;
          },
          {
            cashCents: 0,
            cardCents: 0,
            creditCents: 0,
            slipCents: 0,
            checkCents: 0,
            eWalletCents: 0,
            totalCents: 0
          }
        );
        return (
          <TableRow className="font-medium bg-muted/50">
            <TableCell colSpan={2} className="text-left">
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
      initialEmptyMessage="No drawer balances found. Select date and click Search."
      emptyMessage="No drawer balances found for the selected date."
    />
  );
}

