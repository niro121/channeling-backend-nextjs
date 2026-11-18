'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { formatReceiptAmount } from '@/lib/format-money';
import { APPROVAL_REQUEST_STATUS } from '@/types/approval-request';
import type { ApprovalRequestsReportRow } from '@/types/reports/approval-requests';

function statusBadgeVariant(
  status: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === APPROVAL_REQUEST_STATUS.APPROVED || status === APPROVAL_REQUEST_STATUS.COMPLETED) {
    return 'default';
  }
  if (status === APPROVAL_REQUEST_STATUS.REJECTED) return 'destructive';
  if (status === APPROVAL_REQUEST_STATUS.PENDING) return 'outline';
  return 'secondary';
}

function dash(value: string | null | undefined): string {
  const s = (value ?? '').trim();
  return s || '—';
}

function formatDt(d: Date | null | undefined): string {
  return d ? moment(d).format('YYYY-MM-DD HH:mm') : '—';
}

export const ApprovalRequestsColumns: ColumnDef<ApprovalRequestsReportRow>[] = [
  {
    id: 'sNo',
    header: () => <span className="block text-center">No.</span>,
    cell: ({ row }) => <span className="block text-center tabular-nums">{row.index + 1}</span>,
  },
  {
    accessorKey: 'requestedAt',
    header: 'Requested Time',
    cell: ({ row }) => formatDt(row.getValue<Date | null>('requestedAt')),
  },
  {
    accessorKey: 'typeLabel',
    header: 'Type',
    cell: ({ row }) => row.getValue<string>('typeLabel') ?? '—',
  },
  {
    accessorKey: 'channelType',
    header: 'Channel Type',
    cell: ({ row }) => dash(row.getValue<string>('channelType')),
  },
  {
    accessorKey: 'paymentMode',
    header: 'Payment mode',
    cell: ({ row }) => dash(row.getValue<string>('paymentMode')),
  },
  {
    accessorKey: 'details',
    header: 'Details',
    cell: ({ row }) => (
      <div className="max-w-[260px]">
        <div className="truncate" title={row.original.details}>
          {dash(row.original.details)}
        </div>
        {row.original.detailsSub ? (
          <div className="truncate text-muted-foreground" title={row.original.detailsSub}>
            {row.original.detailsSub}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: 'amount',
    header: () => <span className="block text-right">Amount</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatReceiptAmount(row.getValue<number>('amount') ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: 'requestedByName',
    header: 'Requested by',
    cell: ({ row }) => dash(row.getValue<string>('requestedByName')),
  },
  {
    accessorKey: 'statusLabel',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusBadgeVariant(row.original.status)}>{row.original.statusLabel}</Badge>
    ),
  },
  {
    accessorKey: 'approvedByName',
    header: 'Approved by',
    cell: ({ row }) => dash(row.getValue<string | null>('approvedByName')),
  },
  {
    accessorKey: 'approvedAt',
    header: 'Approved at',
    cell: ({ row }) => formatDt(row.getValue<Date | null>('approvedAt')),
  },
  {
    accessorKey: 'rejectedByName',
    header: 'Rejected by',
    cell: ({ row }) => dash(row.getValue<string | null>('rejectedByName')),
  },
  {
    accessorKey: 'rejectedAt',
    header: 'Rejected at',
    cell: ({ row }) => formatDt(row.getValue<Date | null>('rejectedAt')),
  },
  {
    accessorKey: 'withdrawnAt',
    header: 'Withdraw Time',
    cell: ({ row }) => formatDt(row.getValue<Date | null>('withdrawnAt')),
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => {
      const v = row.getValue<string>('remarks');
      if (!v?.trim()) return '—';
      return (
        <div className="max-w-[180px] truncate" title={v}>
          {v}
        </div>
      );
    },
  },
  {
    accessorKey: 'rejectReason',
    header: 'Reject reason',
    cell: ({ row }) => {
      const v = row.getValue<string | null>('rejectReason');
      if (!v?.trim()) return '—';
      return (
        <div className="max-w-[180px] truncate text-destructive" title={v}>
          {v}
        </div>
      );
    },
  },
];
