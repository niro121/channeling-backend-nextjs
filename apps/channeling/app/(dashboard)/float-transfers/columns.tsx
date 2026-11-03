'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCents } from '@/lib/format-money';
import type { FloatRequest } from '@/types/float-request';
import { floatRequestStatusLabel, formatDenomLabel } from '@/types/float-request';
import { FLOAT_REQUEST_STATUS } from '@/types/float-request';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

export type FloatTransferListRow = FloatRequest;

export type FloatTransferTableMode = 'given' | 'requested';

export type FloatTransferColumnCallbacks = {
  onApprove: (fr: FloatRequest) => void;
  onReject: (fr: FloatRequest) => void;
  onViewSummary: (fr: FloatRequest) => void;
  mode?: FloatTransferTableMode;
};

const statusVariant = (status: number) => {
  switch (status) {
    case FLOAT_REQUEST_STATUS.PENDING:
      return 'secondary';
    case FLOAT_REQUEST_STATUS.APPROVED:
      return 'default';
    case FLOAT_REQUEST_STATUS.RECEIVED:
      return 'outline';
    case FLOAT_REQUEST_STATUS.REJECTED:
      return 'destructive';
    case FLOAT_REQUEST_STATUS.CANCELLED:
      return 'outline';
    default:
      return 'outline';
  }
};

export function getFloatTransferColumns(callbacks: FloatTransferColumnCallbacks): ColumnDef<FloatRequest>[] {
  const { onApprove, onReject, onViewSummary, mode = 'given' } = callbacks;
  const isGiven = mode === 'given';
  return [
    {
      accessorKey: 'floatNoString',
      header: 'Bill No',
      cell: ({ row }) => (
        <span className="tabular-nums whitespace-nowrap">{row.original.floatNoString ?? '—'}</span>
      ),
    },
    {
      id: 'counterparty',
      header: isGiven ? 'Requested by' : 'Assigned to',
      cell: ({ row }) => {
        const fr = row.original;
        if (isGiven) return fr.requestedBy?.name ?? fr.requestedById;
        return fr.bulkCashier?.name ?? fr.bulkCashierId;
      },
    },
    {
      accessorKey: 'amountRequested',
      header: 'Amount (LKR)',
      cell: ({ row }) => <span className="tabular-nums">{formatCents(row.original.amountRequested)}</span>,
    },
    {
      id: 'denominations',
      header: 'Denominations',
      cell: ({ row }) => {
        const fr = row.original;
        const str =
          fr.denominationsRequested
            ?.filter((d) => d.count > 0)
            .map((d) => `${formatDenomLabel(d.value)}×${d.count}`)
            .join(', ') || '—';
        return <span className="text-muted-foreground text-sm">{str}</span>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status as number;
        return (
          <Badge variant={statusVariant(status)}>
            {floatRequestStatusLabel(status)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="text-right block w-full">Actions</span>,
      cell: ({ row }) => {
        const fr = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => onViewSummary(fr)}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            {isGiven && fr.status === FLOAT_REQUEST_STATUS.PENDING && (
              <>
                <Button size="sm" variant="default" onClick={() => onApprove(fr)}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onReject(fr)}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];
}
