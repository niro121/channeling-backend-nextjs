'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { ReportUserSelect } from '@/components/common/user-select';
import { Selector } from '@/components/common/selector';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatReceiptAmount } from '@/lib/format-money';
import { APPROVAL_REQUEST_TYPE } from '@/types/approval-request';
import type {
  ApprovalRequestsReportExportRow,
  ApprovalRequestsReportQuery,
  ApprovalRequestsReportRow,
} from '@/types/reports/approval-requests';
import {
  exportApprovalRequestsReportData,
  getApprovalRequestsReportData,
} from '@/app/actions/reports/approval-requests.report.action';
import { ApprovalRequestsColumns } from './columns';

type Props = {
  currentUserName: string;
  userOptions: Array<{ id: string; name: string }>;
};

const DATE_FIELD_OPTIONS = [
  { id: 'requested', name: 'Requested date' },
  { id: 'decided', name: 'Decision date' },
];

const TYPE_OPTIONS = [
  { id: APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL, name: 'Cancellations' },
  { id: APPROVAL_REQUEST_TYPE.CHANNEL_REFUND, name: 'Refunds' },
  { id: APPROVAL_REQUEST_TYPE.BANK_DEPOSIT, name: 'Bank deposits' },
];

const STATUS_OPTIONS = [
  { id: 'pending', name: 'Pending' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'withdrawn', name: 'Withdrawn' },
  { id: 'completed', name: 'Completed' },
];

function getDefaultFilterValues(): Record<string, string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    dateFrom: `${y}-${m}-${d}`,
    dateTo: `${y}-${m}-${d}`,
    dateField: 'requested',
    type: '__all__',
    status: '__all__',
    requestedById: '__all__',
    decidedById: '__all__',
  };
}

function ContentInner({ currentUserName, userOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): ApprovalRequestsReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    dateField: searchParams.get('dateField') ?? 'requested',
    type: searchParams.get('type') ?? '__all__',
    status: searchParams.get('status') ?? '__all__',
    requestedById: searchParams.get('requestedById') ?? '__all__',
    decidedById: searchParams.get('decidedById') ?? '__all__',
  });

  return (
    <ReportTemplate<ApprovalRequestsReportRow, ApprovalRequestsReportExportRow>
      title="Approval Requests Report"
      description="View Approval Center cancellations, refunds, and bank deposits. Filter by period, type, status, requester, and who approved or rejected."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const df = values.dateFrom ?? '';
          const dt = values.dateTo ?? '';
          const dateField = values.dateField ?? 'requested';
          const type = values.type ?? '__all__';
          const status = values.status ?? '__all__';
          const requestedById = values.requestedById ?? '__all__';
          const decidedById = values.decidedById ?? '__all__';
          const dateFieldLabel =
            DATE_FIELD_OPTIONS.find((o) => o.id === dateField)?.name ?? 'Requested date';
          const typeLabel =
            type === '__all__' ? 'All Types' : TYPE_OPTIONS.find((o) => o.id === type)?.name ?? type;
          const statusLabel =
            status === '__all__'
              ? 'All Statuses'
              : STATUS_OPTIONS.find((o) => o.id === status)?.name ?? status;
          const requestedByLabel =
            requestedById === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === requestedById)?.name ?? requestedById;
          const decidedByLabel =
            decidedById === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === decidedById)?.name ?? decidedById;
          return (
            <>
              <div>
                {dateFieldLabel}: {df} to {dt}
              </div>
              <div>
                Type: {typeLabel} | Status: {statusLabel}
              </div>
              <div>
                Requested by: {requestedByLabel} | Decided by: {decidedByLabel}
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

          <div className="flex-shrink-0">
            <label className="mb-2 block text-sm font-semibold">Date applies to</label>
            <Selector
              label="Requested date"
              options={DATE_FIELD_OPTIONS}
              value={values.dateField ?? 'requested'}
              defaultValue="requested"
              showDefaultOption={false}
              onChange={(v) => setValue('dateField', v)}
            />
          </div>

          <Selector
            label="All Types"
            options={TYPE_OPTIONS}
            value={values.type}
            onChange={(v) => setValue('type', v)}
          />

          <Selector
            label="All Statuses"
            options={STATUS_OPTIONS}
            value={values.status}
            onChange={(v) => setValue('status', v)}
          />

          <ReportUserSelect
            userOptions={userOptions}
            value={values.requestedById ?? '__all__'}
            onChange={(v) => setValue('requestedById', v)}
            label="Requested by"
            widthClassName="w-[240px]"
          />

          <ReportUserSelect
            userOptions={userOptions}
            value={values.decidedById ?? '__all__'}
            onChange={(v) => setValue('decidedById', v)}
            label="Decided by"
            widthClassName="w-[240px]"
          />
        </div>
      )}
      fetchData={async (params) => {
        const query: ApprovalRequestsReportQuery = {
          dateFrom: params.get('dateFrom') ?? '',
          dateTo: params.get('dateTo') ?? '',
          dateField: params.get('dateField') ?? 'requested',
          type: params.get('type') ?? '__all__',
          status: params.get('status') ?? '__all__',
          requestedById: params.get('requestedById') ?? '__all__',
          decidedById: params.get('decidedById') ?? '__all__',
        };
        return getApprovalRequestsReportData(query);
      }}
      exportData={async () => exportApprovalRequestsReportData(buildQuery())}
      columns={ApprovalRequestsColumns}
      exportColumns={[
        'No.',
        'Requested at',
        'Type',
        'Details',
        'Amount',
        'Requested by',
        'Status',
        'Approved by',
        'Approved at',
        'Rejected by',
        'Rejected at',
        'Remarks',
        'Reject reason',
      ]}
      exportKeys={[
        'no',
        'requestedAt',
        'type',
        'details',
        'amount',
        'requestedBy',
        'status',
        'approvedBy',
        'approvedAt',
        'rejectedBy',
        'rejectedAt',
        'remarks',
        'rejectReason',
      ]}
      exportTitle="Approval Requests Report"
      exportFileName="approval-requests-report"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        const totalAmount = rows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
        return (
          <TableRow className="font-semibold bg-muted/50">
            <TableCell colSpan={4} className="text-left">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatReceiptAmount(totalAmount)}
            </TableCell>
            <TableCell colSpan={8} />
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={getDefaultFilterValues()}
      initialEmptyMessage="No approval requests found. Select filters and click Search."
      emptyMessage="No approval requests found for the selected filters."
    />
  );
}

export default function ApprovalRequestsReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
