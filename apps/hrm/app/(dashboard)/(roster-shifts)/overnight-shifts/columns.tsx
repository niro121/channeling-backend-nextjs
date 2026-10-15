'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { formatOvernightHours, formatOvernightMoney } from '@/lib/utils/overnight-shift';
import { format, parseISO, isValid } from 'date-fns';
import type { OvernightShiftRecord } from '@/types/roster';
import OvernightRecordActions from './record-actions';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value);
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

function formatShiftDateTime(date: string, time: string): string {
  return `${formatDisplayDate(date)} - ${time}`;
}

type OvernightStatus = 'draft' | 'pending_approval' | 'published' | 'amended';

const STATUS_STYLES: Record<OvernightStatus, string> = {
  pending_approval: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  published: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
  amended: 'bg-slate-100 text-slate-600 hover:bg-slate-100'
};

const STATUS_LABELS: Record<OvernightStatus, string> = {
  pending_approval: 'Pending Approval',
  published: 'Published',
  draft: 'Draft',
  amended: 'Amended'
};

export const overnightShiftColumns: ColumnDef<OvernightShiftRecord>[] = [
  {
    accessorKey: 'staffCode',
    header: () => <span className="whitespace-nowrap">Staff ID</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums whitespace-nowrap">{row.original.staffCode}</span>
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
        {formatShiftDateTime(row.original.startDate, row.original.startTime)}
      </span>
    )
  },
  {
    id: 'shiftEnd',
    header: () => <span className="whitespace-nowrap">Shift End</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatShiftDateTime(row.original.endDate, row.original.endTime)}
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
    id: 'allowance',
    header: 'Allowance',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatOvernightMoney(row.original.overnightAllowance)}
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
    cell: ({ row }) => {
      const s = row.original.status as OvernightStatus;
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium',
            STATUS_STYLES[s] ?? 'bg-muted text-muted-foreground'
          )}
        >
          {STATUS_LABELS[s] ?? row.original.status}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedUser?.name || row.original.updatedBy || '—'}</span>
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
        <span className="text-xs">{row.original.createdUser?.name || row.original.createdBy || '—'}</span>
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
