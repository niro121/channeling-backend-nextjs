'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { AgentCollectionReceiptReportRow } from '@/types/reports/agent-collection-receipt';
import { formatReceiptAmount } from '@/lib/format-money';

export const AgentCollectionReceiptColumns: ColumnDef<AgentCollectionReceiptReportRow>[] = [
  {
    id: 'sno',
    header: () => <span className="whitespace-nowrap">S.No.</span>,
    cell: ({ row }) => <span className="tabular-nums">{row.index + 1}</span>
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => {
      const d = row.getValue<Date>('createdAt');
      return d ? moment(d).format('YYYY-MM-DD HH:mm:ss') : '-';
    }
  },
  { accessorKey: 'createdUser', header: 'Created User', cell: ({ row }) => row.getValue<string>('createdUser') ?? '-' },
  { accessorKey: 'receiptNoString', header: 'Receipt No', cell: ({ row }) => row.getValue<string>('receiptNoString') ?? '-' },
  { accessorKey: 'remarks', header: 'Remark', cell: ({ row }) => row.getValue<string>('remarks') ?? '-' },
  { accessorKey: 'agencyName', header: 'Agent Name', cell: ({ row }) => row.getValue<string>('agencyName') ?? '-' },
  { accessorKey: 'agencyCode', header: 'Agent Code', cell: ({ row }) => row.getValue<string>('agencyCode') ?? '-' },
  { accessorKey: 'cancelReason', header: 'Cancel Remark', cell: ({ row }) => row.getValue<string>('cancelReason') ?? '-' },
  {
    accessorKey: 'receiptAmount',
    header: () => <span className="text-right block whitespace-nowrap">Receipt Amount</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatReceiptAmount(row.getValue<number>('receiptAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'cashAmount',
    header: () => <span className="text-right block">Cash</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatReceiptAmount(row.getValue<number>('cashAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'cardAmount',
    header: () => <span className="text-right block">Credit Card</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatReceiptAmount(row.getValue<number>('cardAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'chequeAmount',
    header: () => <span className="text-right block">Cheque</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatReceiptAmount(row.getValue<number>('chequeAmount') ?? 0)}</span>
  },
  {
    accessorKey: 'slipAmount',
    header: () => <span className="text-right block">Slip</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatReceiptAmount(row.getValue<number>('slipAmount') ?? 0)}</span>
  },
  { accessorKey: 'slipRef', header: 'Slip Ref', cell: ({ row }) => row.getValue<string>('slipRef') ?? '-' },
  { accessorKey: 'bankName', header: 'Bank Name', cell: ({ row }) => row.getValue<string>('bankName') ?? '-' }
];

