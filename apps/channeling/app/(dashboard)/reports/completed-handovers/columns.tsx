'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import moment from 'moment';
import { ExternalLink, Eye, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCents } from '@/lib/format-money';
import { HANDOVER_STATUS } from '@/types/handover';
import type { CompletedHandoversReportRow } from '@/types/reports/completed-handovers';

function amountCell(cents: number) {
  return <span className="block text-right tabular-nums">{formatCents(cents)}</span>;
}

function statusBadgeVariant(
  status: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === HANDOVER_STATUS.APPROVED) return 'default';
  if (status === HANDOVER_STATUS.REJECTED) return 'destructive';
  return 'secondary';
}

export const CompletedHandoversColumns: ColumnDef<CompletedHandoversReportRow>[] = [
  {
    id: 'sNo',
    header: () => <span className="block text-center">No.</span>,
    cell: ({ row }) => <span className="block text-center tabular-nums">{row.index + 1}</span>,
  },
  {
    accessorKey: 'fromUserName',
    header: 'From',
    cell: ({ row }) => row.getValue<string>('fromUserName') ?? '—',
  },
  {
    accessorKey: 'toUserName',
    header: 'To',
    cell: ({ row }) => row.getValue<string>('toUserName') ?? '—',
  },
  {
    accessorKey: 'shiftStartedAt',
    header: 'Shift started',
    cell: ({ row }) => {
      const d = row.getValue<Date | null>('shiftStartedAt');
      return d ? moment(d).format('YYYY-MM-DD HH:mm') : '—';
    },
  },
  {
    accessorKey: 'cashCents',
    header: () => <span className="block text-right">Cash</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('cashCents') ?? 0),
  },
  {
    accessorKey: 'cardCents',
    header: () => <span className="block text-right">Card</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('cardCents') ?? 0),
  },
  {
    accessorKey: 'slipCents',
    header: () => <span className="block text-right">Slip</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('slipCents') ?? 0),
  },
  {
    accessorKey: 'checkCents',
    header: () => <span className="block text-right">Cheque</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('checkCents') ?? 0),
  },
  {
    accessorKey: 'creditCents',
    header: () => <span className="block text-right">Credit</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('creditCents') ?? 0),
  },
  {
    accessorKey: 'eWalletCents',
    header: () => <span className="block text-right">E-wallet</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('eWalletCents') ?? 0),
  },
  {
    accessorKey: 'totalCents',
    header: () => <span className="block text-right">Total</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums font-medium">
        {formatCents(row.getValue<number>('totalCents') ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: 'statusLabel',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={statusBadgeVariant(row.original.status)}>{row.original.statusLabel}</Badge>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Handover date',
    cell: ({ row }) => {
      const d = row.getValue<Date | null>('createdAt');
      return d ? moment(d).format('YYYY-MM-DD HH:mm') : '—';
    },
  },
  {
    accessorKey: 'completedAt',
    header: 'Completed at',
    cell: ({ row }) => {
      const d = row.getValue<Date | null>('completedAt');
      return d ? moment(d).format('YYYY-MM-DD HH:mm') : '—';
    },
  },
  {
    accessorKey: 'discrepancyReason',
    header: 'Discrepancy',
    cell: ({ row }) => {
      const v = row.getValue<string | null>('discrepancyReason');
      if (!v?.trim()) return '—';
      return (
        <div className="max-w-[180px] truncate" title={v}>
          {v}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <span className="block text-right">Actions</span>,
    cell: ({ row }) => {
      const reportUrl = row.original.cashierSummaryUrl;
      return (
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" asChild>
            <Link href={`/handovers/${row.original.id}`}>
              <Eye className="h-3 w-3 mr-1" />
              View
            </Link>
          </Button>
          {reportUrl ? (
            <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px]" asChild>
              <Link href={reportUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-3 w-3 mr-1" />
                Report
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          ) : null}
        </div>
      );
    },
  },
];
