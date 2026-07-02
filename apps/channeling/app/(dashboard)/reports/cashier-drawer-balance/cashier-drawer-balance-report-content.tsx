'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
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

export default function CashierDrawerBalanceReportContent({ currentUserName, locationOptions }: Props) {
  const searchParams = useSearchParams();
  const defaultAsOf = todayLocalEndOfDayYyyyMmDdHhMm();

  const buildQuery = (): CashierDrawerBalanceReportQuery => ({
    asOfDateTime: searchParams.get('asOfDateTime') ?? defaultAsOf,
    locationId: searchParams.get('locationId') ?? '__all__'
  });

  return (
    <ReportTemplate<CashierDrawerBalanceReportRow, CashierDrawerBalanceReportExportRow>
      title="Cashier Drawer Balance"
      description="Shows till balances by payment method as of selected date/time, with optional branch filter."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
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
        }
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
        const query: CashierDrawerBalanceReportQuery = {
          asOfDateTime: params.get('asOfDateTime') ?? defaultAsOf,
          locationId: params.get('locationId') ?? '__all__'
        };
        return getCashierDrawerBalanceReportData(query);
      }}
      exportData={async () => exportCashierDrawerBalanceReportData(buildQuery())}
      columns={CashierDrawerBalanceReportColumns}
      exportColumns={['Till', 'Cashier', 'Cash', 'Card', 'Credit', 'Slip', 'Cheque', 'E-Wallet', 'Total']}
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
      initialEmptyMessage="No drawer balances found. Select date/time and branch, then click Search."
      emptyMessage="No drawer balances found for the selected filters."
    />
  );
}

