'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { ReportColumnMeta } from '@/app/(dashboard)/report-template';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import type { DailyReturnsSummaryReportRow } from '@/types/reports/daily-returns-summary';

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const floatTotalColumnMeta: ReportColumnMeta = {
  headerClassName: 'bg-muted dark:bg-muted/80 text-right',
  cellClassName: 'bg-muted dark:bg-muted/80',
};

function moneyCell(value: number) {
  return <span className="text-right tabular-nums block">{money(value)}</span>;
}

export const DailyReturnsSummaryReportColumns: ColumnDef<DailyReturnsSummaryReportRow>[] = [
  {
    accessorKey: 'method',
    header: 'Receipt Type',
    cell: ({ row }) => <span className="font-medium">{row.getValue<string>('method')}</span>,
  },
  {
    accessorKey: 'count',
    header: () => <span className="text-center block w-full">Count</span>,
    cell: ({ row }) => (
      <span className="text-center tabular-nums block w-full">{row.getValue<number>('count') ?? 0}</span>
    ),
  },
  {
    accessorKey: 'cash',
    header: () => <span className="text-right block">{PAYMENT_METHOD_NAMES[0]}</span>,
    cell: ({ row }) => moneyCell(row.getValue<number>('cash') ?? 0),
  },
  {
    accessorKey: 'creditCard',
    header: () => <span className="text-right block">{PAYMENT_METHOD_NAMES[1]}</span>,
    cell: ({ row }) => moneyCell(row.getValue<number>('creditCard') ?? 0),
  },
  {
    accessorKey: 'slip',
    header: () => <span className="text-right block">{PAYMENT_METHOD_NAMES[2]}</span>,
    cell: ({ row }) => moneyCell(row.getValue<number>('slip') ?? 0),
  },
  {
    accessorKey: 'cheque',
    header: () => <span className="text-right block">{PAYMENT_METHOD_NAMES[3]}</span>,
    cell: ({ row }) => moneyCell(row.getValue<number>('cheque') ?? 0),
  },
  {
    accessorKey: 'eWallet',
    header: () => <span className="text-right block">{PAYMENT_METHOD_NAMES[6]}</span>,
    cell: ({ row }) => moneyCell(row.getValue<number>('eWallet') ?? 0),
  },
  {
    accessorKey: 'floatTotal',
    meta: floatTotalColumnMeta,
    header: () => <span className="text-right block w-full font-semibold">Float Total</span>,
    cell: ({ row }) => (
      <span className="text-right tabular-nums font-semibold block w-full">
        {money(row.getValue<number>('floatTotal') ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: 'agent',
    header: () => <span className="text-right block">{PAYMENT_METHOD_NAMES[4]}</span>,
    cell: ({ row }) => moneyCell(row.getValue<number>('agent') ?? 0),
  },
  {
    accessorKey: 'credit',
    header: () => <span className="text-right block">Credit</span>,
    cell: ({ row }) => moneyCell(row.getValue<number>('credit') ?? 0),
  },
];
