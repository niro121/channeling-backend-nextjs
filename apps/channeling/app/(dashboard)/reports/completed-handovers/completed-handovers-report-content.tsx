'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { ReportUserSelect } from '@/components/common/user-select';
import { Selector } from '@/components/common/selector';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatCents } from '@/lib/format-money';
import type {
  CompletedHandoversReportExportRow,
  CompletedHandoversReportQuery,
  CompletedHandoversReportRow,
} from '@/types/reports/completed-handovers';
import {
  exportCompletedHandoversReportData,
  getCompletedHandoversReportData,
} from '@/app/actions/reports/completed-handovers.report.action';
import { CompletedHandoversColumns } from './columns';

type Props = {
  currentUserName: string;
  userOptions: Array<{ id: string; name: string }>;
};

const STATUS_OPTIONS = [
  { id: 'pending', name: 'Pending' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
];

const RECONCILIATION_STATUS_OPTIONS = [
  { id: 'pending', name: 'Pending' },
  { id: 'in_reconciliation', name: 'In reconciliation' },
  { id: 'reconciled', name: 'Reconciled' },
  { id: 'rejected', name: 'Rejected' },
];

function getDefaultFilterValues(): Record<string, string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-${d}`,
    dateTo: `${y}-${m}-${d}`,
    fromUserId: '__all__',
    toUserId: '__all__',
    status: '__all__',
    reconciliationStatus: '__all__',
  };
}

function ContentInner({ currentUserName, userOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): CompletedHandoversReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    fromUserId: searchParams.get('fromUserId') ?? '__all__',
    toUserId: searchParams.get('toUserId') ?? '__all__',
    status: searchParams.get('status') ?? '__all__',
    reconciliationStatus: searchParams.get('reconciliationStatus') ?? '__all__',
  });

  return (
    <ReportTemplate<CompletedHandoversReportRow, CompletedHandoversReportExportRow>
      title="Handovers Report"
      description="View pending, approved, and rejected shift handovers for any user. Filter by date, sender, recipient, handover status, and reconciliation status."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const df = values.dateFrom ?? '';
          const dt = values.dateTo ?? '';
          const fromUserId = values.fromUserId ?? '__all__';
          const toUserId = values.toUserId ?? '__all__';
          const status = values.status ?? '__all__';
          const reconciliationStatus = values.reconciliationStatus ?? '__all__';
          const fromLabel =
            fromUserId === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === fromUserId)?.name ?? fromUserId;
          const toLabel =
            toUserId === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === toUserId)?.name ?? toUserId;
          const statusLabel =
            status === '__all__'
              ? 'All Statuses'
              : STATUS_OPTIONS.find((s) => s.id === status)?.name ?? status;
          const reconLabel =
            reconciliationStatus === '__all__'
              ? 'All Reconciliation Statuses'
              : RECONCILIATION_STATUS_OPTIONS.find((s) => s.id === reconciliationStatus)?.name ??
                reconciliationStatus;
          return (
            <>
              <div>
                Range: {df} to {dt}
              </div>
              <div>
                From: {fromLabel} | To: {toLabel} | Status: {statusLabel}
              </div>
              <div>Reconciliation: {reconLabel}</div>
            </>
          );
        },
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-shrink-0">
            <DateRangePicker
              from={values.dateFrom}
              to={values.dateTo}
              onChange={({ from, to }) => {
                setValue('dateFrom', from);
                setValue('dateTo', to);
              }}
            />
          </div>

          <ReportUserSelect
            userOptions={userOptions}
            value={values.fromUserId ?? '__all__'}
            onChange={(v) => setValue('fromUserId', v)}
            label="Handed over by"
            widthClassName="w-[240px]"
          />

          <ReportUserSelect
            userOptions={userOptions}
            value={values.toUserId ?? '__all__'}
            onChange={(v) => setValue('toUserId', v)}
            label="Handed over to"
            widthClassName="w-[240px]"
          />

          <Selector
            label="All Statuses"
            options={STATUS_OPTIONS}
            value={values.status}
            onChange={(v) => setValue('status', v)}
          />

          <Selector
            label="All Reconciliation Statuses"
            options={RECONCILIATION_STATUS_OPTIONS}
            value={values.reconciliationStatus}
            onChange={(v) => setValue('reconciliationStatus', v)}
          />
        </div>
      )}
      fetchData={async (params) => {
        const query: CompletedHandoversReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          fromUserId: params.get('fromUserId') ?? '__all__',
          toUserId: params.get('toUserId') ?? '__all__',
          status: params.get('status') ?? '__all__',
          reconciliationStatus: params.get('reconciliationStatus') ?? '__all__',
        };
        return getCompletedHandoversReportData(query);
      }}
      exportData={async () => exportCompletedHandoversReportData(buildQuery())}
      columns={CompletedHandoversColumns}
      exportColumns={[
        'No.',
        'From',
        'To',
        'Shift started',
        'Cash',
        'Card',
        'Slip',
        'Cheque',
        'Credit',
        'E-wallet',
        'Total',
        'Status',
        'Reconciliation status',
        'Handover date',
        'Completed at',
        'Discrepancy',
      ]}
      exportKeys={[
        'no',
        'fromUser',
        'toUser',
        'shiftStartedAt',
        'cash',
        'card',
        'slip',
        'cheque',
        'credit',
        'eWallet',
        'total',
        'status',
        'reconciliationStatus',
        'createdAt',
        'completedAt',
        'discrepancyReason',
      ]}
      exportTitle="Handovers Report"
      exportFileName="handovers-report"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        const totalCents = rows.reduce((acc, r) => acc + (Number(r.totalCents) || 0), 0);
        const cash = rows.reduce((acc, r) => acc + (Number(r.cashCents) || 0), 0);
        const card = rows.reduce((acc, r) => acc + (Number(r.cardCents) || 0), 0);
        const slip = rows.reduce((acc, r) => acc + (Number(r.slipCents) || 0), 0);
        const cheque = rows.reduce((acc, r) => acc + (Number(r.checkCents) || 0), 0);
        const credit = rows.reduce((acc, r) => acc + (Number(r.creditCents) || 0), 0);
        const eWallet = rows.reduce((acc, r) => acc + (Number(r.eWalletCents) || 0), 0);
        return (
          <TableRow className="font-semibold bg-muted/50">
            <TableCell colSpan={4} className="text-left">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(cash)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(card)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(slip)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(cheque)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(credit)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(eWallet)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCents(totalCents)}</TableCell>
            <TableCell colSpan={6} />
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={getDefaultFilterValues()}
      initialEmptyMessage="No handovers found. Select filters and click Search."
      emptyMessage="No handovers found for the selected filters."
    />
  );
}

export default function CompletedHandoversReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
