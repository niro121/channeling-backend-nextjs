'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { AgentCollectionReceiptReportRow } from '@/types/reports/agent-collection-receipt';
import { formatReceiptAmount } from '@/lib/format-money';

function isCanceled(row: AgentCollectionReceiptReportRow): boolean {
  return !!row.cancelReason?.trim();
}

export const AgentCollectionReceiptColumns: ColumnDef<AgentCollectionReceiptReportRow>[] = [
  {
    id: 'sno',
    header: () => <span className="whitespace-nowrap">S.No.</span>,
    cell: ({ row }) => (
      <span className={`tabular-nums ${isCanceled(row.original) ? 'text-red-600' : ''}`.trim()}>
        {row.index + 1}
      </span>
    )
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => {
      const d = row.getValue<Date>('createdAt');
      const cls = isCanceled(row.original) ? 'text-red-600' : '';
      return <span className={cls}>{d ? moment(d).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>;
    }
  },
  {
    accessorKey: 'createdUser',
    header: 'Created User',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('createdUser') ?? '-'}</span>
  },
  {
    accessorKey: 'receiptNoString',
    header: 'Receipt No',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('receiptNoString') ?? '-'}</span>
  },
  {
    accessorKey: 'remarks',
    header: 'Remark',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('remarks') ?? '-'}</span>
  },
  {
    accessorKey: 'agencyName',
    header: 'Agent Name',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('agencyName') ?? '-'}</span>
  },
  {
    accessorKey: 'agencyCode',
    header: 'Agent Code',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('agencyCode') ?? '-'}</span>
  },
  {
    accessorKey: 'cancelReason',
    header: 'Cancel Remark',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('cancelReason') ?? '-'}</span>
  },
  {
    accessorKey: 'receiptAmount',
    header: () => <span className="text-right block whitespace-nowrap">Receipt Amount</span>,
    cell: ({ row }) => <span className={`text-right tabular-nums block ${isCanceled(row.original) ? 'text-red-600' : ''}`.trim()}>{formatReceiptAmount(row.getValue<number>('receiptAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'cashAmount',
    header: () => <span className="text-right block">Cash</span>,
    cell: ({ row }) => <span className={`text-right tabular-nums block ${isCanceled(row.original) ? 'text-red-600' : ''}`.trim()}>{formatReceiptAmount(row.getValue<number>('cashAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'cardAmount',
    header: () => <span className="text-right block">Credit Card</span>,
    cell: ({ row }) => <span className={`text-right tabular-nums block ${isCanceled(row.original) ? 'text-red-600' : ''}`.trim()}>{formatReceiptAmount(row.getValue<number>('cardAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'chequeAmount',
    header: () => <span className="text-right block">Cheque</span>,
    cell: ({ row }) => <span className={`text-right tabular-nums block ${isCanceled(row.original) ? 'text-red-600' : ''}`.trim()}>{formatReceiptAmount(row.getValue<number>('chequeAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'slipAmount',
    header: () => <span className="text-right block">Slip</span>,
    cell: ({ row }) => <span className={`text-right tabular-nums block ${isCanceled(row.original) ? 'text-red-600' : ''}`.trim()}>{formatReceiptAmount(row.getValue<number>('slipAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'slipRef',
    header: 'Slip Ref',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('slipRef') ?? '-'}</span>
  },
  {
    accessorKey: 'cardRef',
    header: 'Card Ref',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('cardRef') ?? '-'}</span>
  },
  {
    accessorKey: 'bankName',
    header: 'Bank Name',
    cell: ({ row }) => <span className={isCanceled(row.original) ? 'text-red-600' : ''}>{row.getValue<string>('bankName') ?? '-'}</span>
  }
];

