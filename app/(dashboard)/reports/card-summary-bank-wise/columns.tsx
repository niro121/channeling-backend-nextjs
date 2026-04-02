'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { CardSummaryBankWiseReportRow } from '@/types/reports/card-summary-bank-wise';
import { formatReceiptAmount } from '@/lib/format-money';

export const CardSummaryBankWiseSummaryColumns: ColumnDef<CardSummaryBankWiseReportRow>[] = [
  {
    accessorKey: 'bankName',
    header: 'Bank Name',
    cell: ({ row }) => row.getValue<string>('bankName') ?? '-'
  },
  {
    accessorKey: 'count',
    header: () => <span className="text-right block">Count</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{String(row.getValue<number>('count') ?? 0)}</span>
  },
  {
    accessorKey: 'totalAmount',
    header: () => <span className="text-right block">Total</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatReceiptAmount(row.getValue<number>('totalAmount') ?? 0)}</span>
  }
];

export const CardSummaryBankWiseDetailColumns: ColumnDef<CardSummaryBankWiseReportRow>[] = [
  {
    accessorKey: 'receiptNoString',
    header: 'Receipt No',
    cell: ({ row }) => row.getValue<string>('receiptNoString') ?? '-'
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ row }) => {
      const d = row.getValue<Date | null>('createdAt');
      return d ? moment(d).format('YYYY-MM-DD HH:mm') : '-';
    }
  },
  { accessorKey: 'bankName', header: 'Bank Name', cell: ({ row }) => row.getValue<string>('bankName') ?? '-' },
  { accessorKey: 'cardReference', header: 'Card Ref', cell: ({ row }) => row.getValue<string>('cardReference') ?? '-' },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => {
      const v = row.getValue<string>('remarks');
      return (
        <div className="max-w-[260px] truncate" title={v ?? ''}>
          {v ?? '-'}
        </div>
      );
    }
  },
  { accessorKey: 'branch', header: 'Branch', cell: ({ row }) => row.getValue<string>('branch') ?? '-' },
  { accessorKey: 'creator', header: 'Creator', cell: ({ row }) => row.getValue<string>('creator') ?? '-' },
  {
    accessorKey: 'totalAmount',
    header: () => <span className="text-right block">Amount</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatReceiptAmount(row.getValue<number>('totalAmount') ?? 0)}</span>
  }
];

