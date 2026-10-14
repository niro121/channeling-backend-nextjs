'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import type { CashVouchersReportRow } from '@/types/reports/cash-vouchers';

function rowTextClass(type: string): string {
  return type === 'Cash Voucher Cancel' ? 'text-red-600 font-medium' : '';
}

function PersonWhen({ name, at, className }: { name: string | null; at: Date | null; className: string }) {
  if (!name && !at) return <span className={className}>-</span>;
  return (
    <span className={className}>
      <span className="block">{name || '-'}</span>
      <span className="block tabular-nums text-muted-foreground">
        {at ? moment(at).format('YYYY-MM-DD HH:mm:ss') : '-'}
      </span>
    </span>
  );
}

export const CashVouchersColumns: ColumnDef<CashVouchersReportRow>[] = [
  {
    id: 'sNo',
    header: () => <span className="block text-center">No.</span>,
    cell: ({ row }) => (
      <span className={`block text-center tabular-nums ${rowTextClass(row.original.transactionType)}`}>
        {row.index + 1}
      </span>
    ),
  },
  {
    accessorKey: 'transactionType',
    header: 'Type',
    cell: ({ row }) => <span className={rowTextClass(row.original.transactionType)}>{row.original.transactionType}</span>,
  },
  {
    accessorKey: 'receiptNoString',
    header: 'Receipt No.',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>{row.original.receiptNoString || '-'}</span>
    ),
  },
  {
    accessorKey: 'accountName',
    header: 'Reconciliation account',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>{row.original.accountName || '-'}</span>
    ),
  },
  {
    accessorKey: 'convertedTypes',
    header: 'Converted types',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>{row.original.convertedTypes || '-'}</span>
    ),
  },
  {
    accessorKey: 'remarks',
    header: 'Remark',
    cell: ({ row }) => (
      <div className={`max-w-[260px] truncate ${rowTextClass(row.original.transactionType)}`} title={row.original.remarks}>
        {row.original.remarks || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'userLocation',
    header: 'User Location',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>{row.original.userLocation || '-'}</span>
    ),
  },
  {
    accessorKey: 'user',
    header: 'User',
    cell: ({ row }) => <span className={rowTextClass(row.original.transactionType)}>{row.original.user || '-'}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date and Time',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>
        {row.original.createdAt ? moment(row.original.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
      </span>
    ),
  },
  {
    id: 'requestedBy',
    header: 'Requested By',
    cell: ({ row }) => (
      <PersonWhen
        name={row.original.requestedBy}
        at={row.original.requestedAt}
        className={rowTextClass(row.original.transactionType)}
      />
    ),
  },
  {
    id: 'approvedBy',
    header: 'Approved By',
    cell: ({ row }) => (
      <PersonWhen
        name={row.original.approvedBy}
        at={row.original.approvedAt}
        className={rowTextClass(row.original.transactionType)}
      />
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: () => <span className="text-right block">Total</span>,
    cell: ({ row }) => (
      <span className={`text-right tabular-nums block ${rowTextClass(row.original.transactionType)}`}>
        {formatReceiptAmount(row.original.totalAmount ?? 0)}
      </span>
    ),
  },
];
