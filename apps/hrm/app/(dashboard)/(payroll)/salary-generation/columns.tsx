'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@archmage/ui';
import { formatAmount } from '@/lib/utils/currency';
import type {
  SalaryGenerationPreviewRow,
  SalaryGenerationStaffRow
} from '@/types/payroll';

export const salaryGenerationStaffColumns: ColumnDef<SalaryGenerationStaffRow>[] =
  [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false
    },
    {
      id: 'rowNumber',
      header: '#',
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination?.pageIndex ?? 0;
        const pageSize = table.getState().pagination?.pageSize ?? 10;
        return (
          <span className="tabular-nums text-muted-foreground">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
      enableHiding: false
    },
    {
      accessorKey: 'roster',
      header: 'Roster',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.roster || '—'}</span>
      )
    },
    {
      accessorKey: 'resignedDate',
      header: 'Resigned Date',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {row.original.resignedDate || '—'}
        </span>
      )
    },
    {
      accessorKey: 'workingDaysPh',
      header: 'Working Days(PH)',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.workingDaysPh}</span>
      )
    },
    {
      accessorKey: 'workingDaysWork',
      header: 'Working Days(Work)',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.workingDaysWork}</span>
      )
    },
    {
      accessorKey: 'designation',
      header: 'Designation',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.designation || '—'}
        </span>
      )
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {row.original.code || '—'}
        </span>
      )
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">
          {row.original.name || '—'}
        </span>
      )
    }
  ];

function amountCell(value: number) {
  return <span className="tabular-nums">{formatAmount(value)}</span>;
}

/** Display-only columns for Generated Salary Preview (no row selection). */
export const salaryGenerationPreviewColumns: ColumnDef<SalaryGenerationPreviewRow>[] =
  [
    {
      accessorKey: 'employee',
      header: 'Employee',
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">
          {row.original.employee || '—'}
        </span>
      )
    },
    {
      accessorKey: 'basic',
      header: 'Basic',
      cell: ({ row }) => amountCell(row.original.basic)
    },
    {
      accessorKey: 'allowances',
      header: 'Allowances',
      cell: ({ row }) => amountCell(row.original.allowances)
    },
    {
      accessorKey: 'ot',
      header: 'OT',
      cell: ({ row }) => amountCell(row.original.ot)
    },
    {
      accessorKey: 'gross',
      header: 'Gross',
      cell: ({ row }) => amountCell(row.original.gross)
    },
    {
      accessorKey: 'epf8',
      header: 'EPF 8%',
      cell: ({ row }) => amountCell(row.original.epf8)
    },
    {
      accessorKey: 'paye',
      header: 'PAYE',
      cell: ({ row }) => amountCell(row.original.paye)
    },
    {
      accessorKey: 'loans',
      header: 'Loans',
      cell: ({ row }) => amountCell(row.original.loans)
    },
    {
      accessorKey: 'net',
      header: 'Net',
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {formatAmount(row.original.net)}
        </span>
      )
    }
  ];
