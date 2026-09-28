'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@archmage/ui';
import type { BulkPaysheetStaffRow } from '@/types/payroll';

export const bulkStaffColumns: ColumnDef<BulkPaysheetStaffRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all on page"
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
    accessorKey: 'staffCode',
    header: 'Emp Code',
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.staffCode || '—'}
      </span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Employee',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">
        {row.original.staffName || '—'}
      </span>
    )
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.department || '—'}</span>
    )
  },
  {
    accessorKey: 'institution',
    header: 'Institution',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.institution || '—'}
      </span>
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
    accessorKey: 'staffCategory',
    header: 'Staff Category',
    cell: ({ row }) => row.original.staffCategory || '—'
  },
  {
    accessorKey: 'grade',
    header: 'Grade',
    cell: ({ row }) => row.original.grade || '—'
  },
  {
    accessorKey: 'roster',
    header: 'Roster',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.roster || '—'}</span>
    )
  }
];

export const BULK_STAFF_EXPORT_COLUMNS = [
  'Emp Code',
  'Employee',
  'Department',
  'Institution',
  'Designation',
  'Staff Category',
  'Grade',
  'Roster'
];

export const BULK_STAFF_EXPORT_KEYS = [
  'staffCode',
  'staffName',
  'department',
  'institution',
  'designation',
  'staffCategory',
  'grade',
  'roster'
];
