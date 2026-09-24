'use client';

import React, { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { ReportUserSelect } from '@/components/common/user-select';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { toBrandedPdfSummaryItems } from '@/components/common/report-print';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
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
import { BankDepositsPrintLayout } from './bank-deposits-print-layout';
import { downloadBankDepositsReportPdf } from './bank-deposits-pdf';
import { downloadBankDepositsReportExcel } from './bank-deposits-excel';

type Props = {
  currentUserName: string;
  bankAccountOptions: Array<{ id: string; name: string }>;
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
    locationId: '__all__',
  };
}

function ContentInner({ currentUserName, bankAccountOptions, userOptions, locationOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): BankDepositsReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    bankAccountId: searchParams.get('bankAccountId') ?? '__all__',
    userId: searchParams.get('userId') ?? '__all__',
    locationId: searchParams.get('locationId') ?? '__all__',
  });

  const buildSummaryItems = useCallback(
    (values: Record<string, string | undefined>): ReportPrintSummaryItem[] => {
      const df = values.dateFrom ?? '';
      const dt = values.dateTo ?? '';
      const bankAccountId = values.bankAccountId ?? '__all__';
      const userId = values.userId ?? '__all__';
      const locationId = values.locationId ?? '__all__';
      return [
        {
          label: 'Period',
          value: `${df || '—'} to ${dt || '—'}`,
          fullWidth: true,
        },
        {
          label: 'Branch',
          value:
            locationId === '__all__'
              ? 'All Branches'
              : locationOptions.find((l) => l.id === locationId)?.name ?? locationId,
        },
        {
          label: 'Bank Account',
          value:
            bankAccountId === '__all__'
              ? 'All Bank Accounts'
              : bankAccountOptions.find((b) => b.id === bankAccountId)?.name ?? bankAccountId,
        },
        {
          label: 'User',
          value:
            userId === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === userId)?.name ?? userId,
        },
      ];
    },
    [bankAccountOptions, userOptions, locationOptions]
  );

  const handlePdfDownload = useCallback(
    async (args: {
      title: string;
      data: BankDepositsReportExportRow[];
      columns: string[];
      keys: (keyof BankDepositsReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadBankDepositsReportPdf({
        reportName: 'Bank Deposits',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(buildQuery())),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
      });
    },
    [buildSummaryItems]
  );

  const handleExcelDownload = useCallback(
    async (args: {
      title: string;
      data: BankDepositsReportExportRow[];
      columns: string[];
      keys: (keyof BankDepositsReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadBankDepositsReportExcel({
        reportName: 'Bank Deposits',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(buildQuery())),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
        sheetName: 'Bank Deposits',
      });
    },
    [buildSummaryItems]
  );

  return (
    <ReportTemplate<BankDepositsReportRow, BankDepositsReportExportRow>
      title="Bank Deposits"
      description="Lists bank deposit and bank withdraw receipts by date/time range with optional branch, bank account, and user filters."
      filterButtonLabel="Search"
      showBackButton={false}
      printPageSize="A4 portrait"
      exportOrientation="portrait"
      containerClassName="w-full py-2 space-y-3 bank-deposits-report-root"
      renderPrintContent={(rows) => <BankDepositsPrintLayout rows={rows} />}
      customDownloadPdf={handlePdfDownload}
      customDownloadExcel={handleExcelDownload}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const df = values.dateFrom ?? '';
          const dt = values.dateTo ?? '';
          const bankAccountId = values.bankAccountId ?? '__all__';
          const userId = values.userId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const bankAccountLabel =
            bankAccountId === '__all__'
              ? 'All Bank Accounts'
              : bankAccountOptions.find((b) => b.id === bankAccountId)?.name ?? bankAccountId;
          const userLabel = userId === '__all__' ? 'All Users' : userOptions.find((u) => u.id === userId)?.name ?? userId;
          const branchLabel =
            locationId === '__all__'
              ? 'All Branches'
              : locationOptions.find((l) => l.id === locationId)?.name ?? locationId;
          return (
            <>
              <div>Range: {df} to {dt}</div>
              <div>
                Branch: {branchLabel} | Bank Account: {bankAccountLabel} | User: {userLabel}
              </div>
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
        const query: BankDepositsReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          bankAccountId: params.get('bankAccountId') ?? '__all__',
          userId: params.get('userId') ?? '__all__',
          locationId: params.get('locationId') ?? '__all__',
        };
        return getBankDepositsReportData(query);
      }}
      exportData={async () => exportBankDepositsReportData(buildQuery())}
      columns={BankDepositsColumns}
      exportColumns={['No.', 'Type', 'Receipt No.', 'Remark', 'User Location', 'User', 'Created Date and Time', 'Approved By', 'Approved At', 'Bank Account', 'Total']}
      exportKeys={['no', 'transactionType', 'receiptNo', 'remarks', 'userLocation', 'user', 'createdAt', 'approvedBy', 'approvedAt', 'bankAccount', 'total']}
      exportTitle="Bank Deposits"
      exportFileName="bank-deposits"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        const totalAmount = rows.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
        return (
          <TableRow className="font-medium bg-muted/50">
            <TableCell colSpan={10} className="text-left">
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
