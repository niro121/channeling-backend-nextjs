'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@archmage/ui';
import type { SalaryGenerationStaffRow } from '@/types/payroll';

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
