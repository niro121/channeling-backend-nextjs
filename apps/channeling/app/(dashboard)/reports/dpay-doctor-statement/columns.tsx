'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatLKR } from '@/lib/format-money';
import type { DpayDoctorStatementRow } from '@/types/reports/dpay-doctor-statement';

function moneyCell(value: number | null, emphasize: boolean) {
  if (value == null) return <span className="block text-right text-muted-foreground">—</span>;
  return (
    <span className={`text-right tabular-nums block ${emphasize ? 'font-semibold' : ''}`}>
      {formatLKR(value)}
    </span>
  );
}

export const DpayDoctorStatementColumns: ColumnDef<DpayDoctorStatementRow>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className={row.original.kind === 'opening' ? 'font-semibold' : ''}>{row.original.date}</span>
    ),
  },
  {
    accessorKey: 'particulars',
    header: 'Particulars',
    cell: ({ row }) => (
      <span className={row.original.kind === 'opening' ? 'font-semibold' : ''}>
        {row.original.particulars}
      </span>
    ),
  },
  {
    accessorKey: 'debit',
    header: () => <span className="text-right block">Debit</span>,
    cell: ({ row }) => moneyCell(row.original.debit, row.original.kind === 'opening'),
  },
  {
    accessorKey: 'credit',
    header: () => <span className="text-right block">Credit</span>,
    cell: ({ row }) => moneyCell(row.original.credit, row.original.kind === 'opening'),
  },
  {
    accessorKey: 'balance',
    header: () => <span className="text-right block">Balance</span>,
    cell: ({ row }) => (
      <span
        className={`text-right tabular-nums block ${row.original.kind === 'opening' ? 'font-semibold' : ''}`}
      >
        {formatLKR(row.original.balance)}
      </span>
    ),
  },
];
