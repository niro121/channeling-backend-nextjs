'use client';

import React, { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { ReportUserSelect } from '@/components/common/user-select';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  CashVouchersReportExportRow,
  CashVouchersReportQuery,
  CashVouchersReportRow,
} from '@/types/reports/cash-vouchers';
import {
  exportCashVouchersReportData,
  getCashVouchersReportData,
} from '@/app/actions/reports/cash-vouchers.report.action';
import { CashVouchersColumns } from './columns';

type Props = {
  currentUserName: string;
  accountOptions: Array<{ id: string; name: string }>;
  userOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
};

function getDefaultFilterValues(): Record<string, string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-${d}T00:00`,
    dateTo: `${y}-${m}-${d}T23:59`,
    accountId: '__all__',
    userId: '__all__',
    locationId: '__all__',
  };
}

function ContentInner({ currentUserName, accountOptions, userOptions, locationOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): CashVouchersReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    accountId: searchParams.get('accountId') ?? '__all__',
    userId: searchParams.get('userId') ?? '__all__',
    locationId: searchParams.get('locationId') ?? '__all__',
  });

  const buildSummaryItems = useCallback(
    (values: Record<string, string | undefined>) => {
      const accountId = values.accountId ?? '__all__';
      const userId = values.userId ?? '__all__';
      const locationId = values.locationId ?? '__all__';
      return [
        { label: 'Period', value: `${values.dateFrom || '—'} to ${values.dateTo || '—'}`, fullWidth: true },
        {
          label: 'Branch',
          value: locationId === '__all__' ? 'All Branches' : locationOptions.find((l) => l.id === locationId)?.name ?? locationId,
        },
        {
          label: 'Account',
          value: accountId === '__all__' ? 'All reconciliation accounts' : accountOptions.find((a) => a.id === accountId)?.name ?? accountId,
        },
        {
          label: 'User',
          value: userId === '__all__' ? 'All Users' : userOptions.find((u) => u.id === userId)?.name ?? userId,
        },
      ];
    },
    [accountOptions, locationOptions, userOptions]
  );

  return (
    <ReportTemplate<CashVouchersReportRow, CashVouchersReportExportRow>
      title="Cash Vouchers"
      description="Lists cash voucher and cash voucher cancel receipts. A voucher converts reconciled non-cash into till cash."
      filterButtonLabel="Search"
      showBackButton={false}
      printPageSize="A4 landscape"
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const items = buildSummaryItems(values);
          return (
            <>
              {items.map((item) => (
                <div key={item.label}>
                  {item.label}: {item.value}
                </div>
              ))}
            </>
          );
        },
        formatPrintSummaryItems: (values) => buildSummaryItems(values),
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
          <div className="w-[320px]">
            <label className="text-sm font-semibold mb-2 block">Reconciliation account</label>
            <Combobox
              label="Reconciliation account"
              options={accountOptions}
              value={values.accountId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('accountId', v ?? '__all__')}
            />
          </div>
          <div className="w-[280px]">
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
          <ReportUserSelect
            userOptions={userOptions}
            value={values.userId ?? '__all__'}
            onChange={(v) => setValue('userId', v)}
            label="User"
            widthClassName="w-[240px]"
          />
        </div>
      )}
      fetchData={async (params) => {
        const query: CashVouchersReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          accountId: params.get('accountId') ?? '__all__',
          userId: params.get('userId') ?? '__all__',
          locationId: params.get('locationId') ?? '__all__',
        };
        return getCashVouchersReportData(query);
      }}
      exportData={async () => exportCashVouchersReportData(buildQuery())}
      columns={CashVouchersColumns}
      exportColumns={[
        'No.',
        'Type',
        'Receipt No.',
        'Remark',
        'User Location',
        'User',
        'Created Date and Time',
        'Requested By',
        'Approved By',
        'Reconciliation account',
        'Converted types',
        'Total',
      ]}
      exportKeys={[
        'no',
        'transactionType',
        'receiptNo',
        'remarks',
        'userLocation',
        'user',
        'createdAt',
        'requestedBy',
        'approvedBy',
        'account',
        'convertedTypes',
        'total',
      ]}
      exportTitle="Cash Vouchers"
      exportFileName="cash-vouchers"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        const totalAmount = rows.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
        return (
          <TableRow className="font-medium bg-muted/50">
            <TableCell colSpan={11} className="text-left">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {formatReceiptAmount(totalAmount)}
            </TableCell>
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={getDefaultFilterValues()}
      initialEmptyMessage="No cash vouchers found. Select filters and click Search."
      emptyMessage="No cash vouchers found for the selected filters."
    />
  );
}

export default function CashVouchersReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
