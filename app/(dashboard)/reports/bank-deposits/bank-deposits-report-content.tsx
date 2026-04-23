'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { ReportUserSelect } from '@/components/common/user-select';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  BankDepositsReportExportRow,
  BankDepositsReportQuery,
  BankDepositsReportRow,
} from '@/types/reports/bank-deposits';
import {
  exportBankDepositsReportData,
  getBankDepositsReportData,
} from '@/app/actions/reports/bank-deposits.report.action';
import { BankDepositsColumns } from './columns';

type Props = {
  currentUserName: string;
  bankAccountOptions: Array<{ id: string; name: string }>;
  userOptions: Array<{ id: string; name: string }>;
};

function getDefaultDateTimeRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-${d}T00:00`,
    dateTo: `${y}-${m}-${d}T23:59`,
  };
}

function ContentInner({ currentUserName, bankAccountOptions, userOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): BankDepositsReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    bankAccountId: searchParams.get('bankAccountId') ?? '__all__',
    userId: searchParams.get('userId') ?? '__all__',
  });

  return (
    <ReportTemplate<BankDepositsReportRow, BankDepositsReportExportRow>
      title="Bank Deposits"
      description="Lists bank deposit and bank withdraw receipts by date/time range with optional bank account filtering."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const df = values.dateFrom ?? '';
          const dt = values.dateTo ?? '';
          const bankAccountId = values.bankAccountId ?? '__all__';
          const userId = values.userId ?? '__all__';
          const bankAccountLabel =
            bankAccountId === '__all__'
              ? 'All Bank Accounts'
              : bankAccountOptions.find((b) => b.id === bankAccountId)?.name ?? bankAccountId;
          const userLabel = userId === '__all__' ? 'All Users' : userOptions.find((u) => u.id === userId)?.name ?? userId;
          return (
            <>
              <div>Range: {df} to {dt}</div>
              <div>Bank Account: {bankAccountLabel} | User: {userLabel}</div>
            </>
          );
        },
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
            <label className="text-sm font-semibold mb-2 block">Bank Account</label>
            <Combobox
              label="Bank Account"
              options={bankAccountOptions}
              value={values.bankAccountId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('bankAccountId', v ?? '__all__')}
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
        const query: BankDepositsReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          bankAccountId: params.get('bankAccountId') ?? '__all__',
          userId: params.get('userId') ?? '__all__',
        };
        return getBankDepositsReportData(query);
      }}
      exportData={async () => exportBankDepositsReportData(buildQuery())}
      columns={BankDepositsColumns}
      exportColumns={['No.', 'Type', 'Receipt No.', 'Remark', 'User Location', 'User', 'Created Date and Time', 'Bank Account', 'Total']}
      exportKeys={['no', 'transactionType', 'receiptNo', 'remarks', 'userLocation', 'user', 'createdAt', 'bankAccount', 'total']}
      exportTitle="Bank Deposits"
      exportFileName="bank-deposits"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        const totalAmount = rows.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
        return (
          <TableRow className="font-medium bg-muted/50">
            <TableCell colSpan={8} className="text-left">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums font-semibold">
              {formatReceiptAmount(totalAmount)}
            </TableCell>
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={getDefaultDateTimeRange()}
      initialEmptyMessage="No bank deposits found. Select filters and click Search."
      emptyMessage="No bank deposits found for the selected filters."
    />
  );
}

export default function BankDepositsReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}

