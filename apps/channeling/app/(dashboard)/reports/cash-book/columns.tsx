'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatCents } from '@/lib/format-money';
import type { CashBookReportRow } from '@/types/reports/cash-book';

export const CashBookReportColumns: ColumnDef<CashBookReportRow>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => new Date(row.getValue<Date>('date')).toLocaleString(),
  },
  {
    accessorKey: 'journalNumber',
    header: 'Journal #',
    cell: ({ row }) => row.original.journalNumber ?? '-',
  },
  {
    accessorKey: 'accountLabel',
    header: 'Account',
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'paymentMethodLabel',
    header: 'Type',
  },
  {
    accessorKey: 'debitAmount',
    header: () => <span className="block text-right">Debit</span>,
    cell: ({ row }) => {
      const value = row.original.debitAmount;
      return <span className="block text-right tabular-nums">{value > 0 ? formatCents(value) : '-'}</span>;
    },
  },
  {
    accessorKey: 'creditAmount',
    header: () => <span className="block text-right">Credit</span>,
    cell: ({ row }) => {
      const value = row.original.creditAmount;
      return <span className="block text-right tabular-nums">{value > 0 ? formatCents(value) : '-'}</span>;
    },
  },
  {
    accessorKey: 'runningBalance',
    header: () => <span className="block text-right">Balance</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums font-semibold">{formatCents(row.original.runningBalance)}</span>
    ),
  },
];
