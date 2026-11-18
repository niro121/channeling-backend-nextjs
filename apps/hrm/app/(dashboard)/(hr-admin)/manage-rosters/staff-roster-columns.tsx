'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { StaffRosterMemberRow } from '@/types/manage-roster';
import StaffRosterRecordActions from './staff-roster-record-actions';

export const staffRosterColumns: ColumnDef<StaffRosterMemberRow>[] = [
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
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'staffCode',
    header: () => <span className="whitespace-nowrap">Staff ID</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.staffCode?.trim() || '—'}
      </span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Staff Name',
    cell: ({ row }) => <span>{row.original.staffName?.trim() || '—'}</span>
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.department?.trim() || '—'}
      </span>
    )
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.designation?.trim() || '—'}
      </span>
    )
  },
  {
    accessorKey: 'phone',
    header: () => <span className="whitespace-nowrap">Phone / Mobile</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.phone?.trim() || '—'}
      </span>
    )
  },
  {
    accessorKey: 'currentShift',
    header: () => <span className="whitespace-nowrap">Current Shift</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.currentShift?.trim() || '—'}
      </span>
    )
  },
  {
    accessorKey: 'rosterName',
    header: 'Roster',
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <span>{row.original.rosterName?.trim() || '—'}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.rosterCode}
        </span>
      </div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status?.trim() || '—';
      const normalized = status.toLowerCase();
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium capitalize',
            normalized === 'active' &&
              'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
            (normalized === 'inactive' || normalized === 'on leave') &&
              'bg-orange-100 text-orange-700 hover:bg-orange-100'
          )}
        >
          {status}
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <StaffRosterRecordActions record={row.original} />,
    enableHiding: false
  }
];
