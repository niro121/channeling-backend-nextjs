'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { format, parseISO, isValid } from 'date-fns';
import OvernightRecordActions from './record-actions';
import {
  formatOvernightHours,
  formatOvernightMoney,
  type OvernightShiftSample,
  type OvernightShiftStatus
} from './sample-data';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value);
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

function formatShiftDateTime(date: string, time: string): string {
  return `${formatDisplayDate(date)} - ${time}`;
}

const STATUS_STYLES: Record<OvernightShiftStatus, string> = {
  pending_approval: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
  amended: 'bg-slate-100 text-slate-600 hover:bg-slate-100'
};

const STATUS_LABELS: Record<OvernightShiftStatus, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft',
  amended: 'Amended'
};

export const overnightShiftColumns: ColumnDef<OvernightShiftSample>[] = [
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
      <span className="font-medium tabular-nums">{row.original.staffCode}</span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Staff Name',
    cell: ({ row }) => <span>{row.original.staffName}</span>
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.department}</span>
    )
  },
  {
    accessorKey: 'unit',
    header: 'Unit',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.unit}</span>
    )
  },
  {
    id: 'shiftStart',
    header: () => <span className="whitespace-nowrap">Shift Start</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatShiftDateTime(row.original.shiftStart, row.original.startTime)}
      </span>
    )
  },
  {
    id: 'shiftEnd',
    header: () => <span className="whitespace-nowrap">Shift End</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatShiftDateTime(row.original.shiftEnd, row.original.endTime)}
      </span>
    )
  },
  {
    accessorKey: 'day1Hours',
    header: () => <span className="whitespace-nowrap">Day 1 Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatOvernightHours(row.original.day1Hours)}
      </span>
    )
  },
  {
    accessorKey: 'day2Hours',
    header: () => <span className="whitespace-nowrap">Day 2 Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatOvernightHours(row.original.day2Hours)}
      </span>
    )
  },
  {
    accessorKey: 'totalHours',
    header: () => <span className="whitespace-nowrap">Total Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatOvernightHours(row.original.totalHours)}
      </span>
    )
  },
  {
    accessorKey: 'attendanceDate',
    header: () => <span className="whitespace-nowrap">Attendance Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDisplayDate(row.original.attendanceDate)}
      </span>
    )
  },
  {
    accessorKey: 'overnightOt',
    header: () => <span className="whitespace-nowrap">Overnight OT</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatOvernightHours(row.original.overnightOt)}
      </span>
    )
  },
  {
    accessorKey: 'allowance',
    header: 'Allowance',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatOvernightMoney(row.original.allowance)}
      </span>
    )
  },
  {
    accessorKey: 'payrollReady',
    header: () => <span className="whitespace-nowrap">Payroll Ready</span>,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          row.original.payrollReady
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
            : 'bg-muted text-muted-foreground hover:bg-muted'
        )}
      >
        {row.original.payrollReady ? 'Yes' : 'No'}
      </Badge>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          STATUS_STYLES[row.original.status]
        )}
      >
        {STATUS_LABELS[row.original.status]}
      </Badge>
    )
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.updatedAt)}
        </span>
      </div>
    )
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.createdBy || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <OvernightRecordActions record={row.original} />,
    enableHiding: false
  }
];
