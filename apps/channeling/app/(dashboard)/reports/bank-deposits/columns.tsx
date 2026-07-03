'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import type { BankDepositsReportRow } from '@/types/reports/bank-deposits';

function rowTextClass(type: string | null | undefined): string {
  return type === 'Bank Withdraw' ? 'text-red-600 font-medium' : '';
}

export const BankDepositsColumns: ColumnDef<BankDepositsReportRow>[] = [
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
    cell: ({ row }) => {
      const type = row.getValue<string>('transactionType') ?? '-';
      return <span className={rowTextClass(type)}>{type}</span>;
    },
  },
  {
    accessorKey: 'receiptNoString',
    header: 'Receipt No.',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>
        {row.getValue<string>('receiptNoString') ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'remarks',
    header: 'Remark',
    cell: ({ row }) => {
      const v = row.getValue<string>('remarks');
      return (
        <div className={`max-w-[260px] truncate ${rowTextClass(row.original.transactionType)}`} title={v ?? ''}>
          {v ?? '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'userLocation',
    header: 'User Location',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>
        {row.getValue<string>('userLocation') ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'user',
    header: 'User',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>
        {row.getValue<string>('user') ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date and Time',
    cell: ({ row }) => {
      const d = row.getValue<Date | null>('createdAt');
      return <span className={rowTextClass(row.original.transactionType)}>{d ? moment(d).format('YYYY-MM-DD HH:mm') : '-'}</span>;
    },
  },
  {
    accessorKey: 'bankAccountName',
    header: 'Bank Account',
    cell: ({ row }) => (
      <span className={rowTextClass(row.original.transactionType)}>
        {row.getValue<string>('bankAccountName') ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: () => <span className="text-right block">Total</span>,
    cell: ({ row }) => {
      return (
        <span className={`text-right tabular-nums block ${rowTextClass(row.original.transactionType)}`}>
          {formatReceiptAmount(row.getValue<number>('totalAmount') ?? 0)}
        </span>
      );
    },
  },
];

