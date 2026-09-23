'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatAmount } from '@/lib/utils/currency';
import type { SalaryProcessingBreakdownRow } from '@/types/payroll';
import RecordActions from './record-actions';

type SalaryProcessingColumnsOptions = {
  onView: (record: SalaryProcessingBreakdownRow) => void;
};

function amountCell(value: number) {
  return <span className="tabular-nums">{formatAmount(value)}</span>;
}

export function createSalaryProcessingColumns(
  options: SalaryProcessingColumnsOptions
): ColumnDef<SalaryProcessingBreakdownRow>[] {
  return [
    {
      id: 'staff',
      header: 'Staff',
      cell: ({ row }) => (
        <div className="min-w-[10rem]">
          <p className="font-medium whitespace-nowrap">
            {row.original.staffName || '—'}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {row.original.staffCode || '—'}
          </p>
        </div>
      )
    },
    {
      accessorKey: 'basic',
      header: 'Basic',
      cell: ({ row }) => amountCell(row.original.basic)
    },
    {
      accessorKey: 'ot',
      header: 'OT',
      cell: ({ row }) => amountCell(row.original.ot)
    },
    {
      accessorKey: 'allowances',
      header: 'Allowances',
      cell: ({ row }) => amountCell(row.original.allowances)
    },
    {
      accessorKey: 'deductions',
      header: 'Deductions',
      cell: ({ row }) => amountCell(row.original.deductions)
    },
    {
      accessorKey: 'epf12',
      header: 'EPF (12%)',
      cell: ({ row }) => amountCell(row.original.epf12)
    },
    {
      accessorKey: 'etf3',
      header: 'ETF (3%)',
      cell: ({ row }) => amountCell(row.original.etf3)
    },
    {
      accessorKey: 'paye',
      header: 'PAYE',
      cell: ({ row }) => amountCell(row.original.paye)
    },
    {
      accessorKey: 'netSalary',
      header: 'Net Salary',
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {formatAmount(row.original.netSalary)}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <RecordActions record={row.original} onView={options.onView} />
      ),
      enableHiding: false
    }
  ];
}
