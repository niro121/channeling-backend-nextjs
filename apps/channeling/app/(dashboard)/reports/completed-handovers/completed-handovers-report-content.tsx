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
  { id: 'approved', name: 'Approved' },
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
  });

  return (
    <ReportTemplate<CompletedHandoversReportRow, CompletedHandoversReportExportRow>
      title="Completed Handovers"
      description="View approved and rejected shift handovers for any user. Filter by date, sender, recipient, and status."
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
          return (
            <>
              <div>
                Range: {df} to {dt}
              </div>
              <div>
                From: {fromLabel} | To: {toLabel} | Status: {statusLabel}
              </div>
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
        </div>
      )}
      fetchData={async (params) => {
        const query: CompletedHandoversReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          fromUserId: params.get('fromUserId') ?? '__all__',
          toUserId: params.get('toUserId') ?? '__all__',
          status: params.get('status') ?? '__all__',
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
        'createdAt',
        'completedAt',
        'discrepancyReason',
      ]}
      exportTitle="Completed Handovers"
      exportFileName="completed-handovers"
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
            <TableCell colSpan={5} />
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={getDefaultFilterValues()}
      initialEmptyMessage="No completed handovers found. Select filters and click Search."
      emptyMessage="No completed handovers found for the selected filters."
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
