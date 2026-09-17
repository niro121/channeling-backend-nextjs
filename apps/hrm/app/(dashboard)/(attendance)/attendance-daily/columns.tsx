'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, History, Pencil } from 'lucide-react';
import { Badge, Button } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { DailyAttendanceRow } from '@/types/attendance';

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  late: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  early_out: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  absent: 'bg-red-100 text-red-700 hover:bg-red-100',
  missing_punch: 'bg-red-100 text-red-700 hover:bg-red-100',
  incomplete: 'bg-rose-50 text-rose-700 hover:bg-rose-50',
  leave: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  half_day: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  day_off: 'bg-emerald-50 text-emerald-800 hover:bg-emerald-50',
  holiday: 'bg-violet-100 text-violet-800 hover:bg-violet-100'
};

export const dailyAttendanceColumns: ColumnDef<DailyAttendanceRow>[] = [
  {
    accessorKey: 'staffCode',
    header: () => <span className="whitespace-nowrap">Staff Code</span>,
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
    cell: ({ row }) => <span>{row.original.department || '—'}</span>
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
    cell: ({ row }) => <span>{row.original.designation || '—'}</span>
  },
  {
    accessorKey: 'dateLabel',
    header: 'Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {row.original.dateLabel}
      </span>
    )
  },
  {
    accessorKey: 'scheduledShift',
    header: () => <span className="whitespace-nowrap">Scheduled Shift</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.scheduledShift}</span>
    )
  },
  {
    accessorKey: 'shiftStart',
    header: () => <span className="whitespace-nowrap">Shift Start</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.shiftStart}</span>
    )
  },
  {
    accessorKey: 'shiftEnd',
    header: () => <span className="whitespace-nowrap">Shift End</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.shiftEnd}</span>
    )
  },
  {
    accessorKey: 'checkIn',
    header: () => <span className="whitespace-nowrap">Check In</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.checkIn}</span>
    )
  },
  {
    accessorKey: 'checkOut',
    header: () => <span className="whitespace-nowrap">Check Out</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.checkOut}</span>
    )
  },
  {
    accessorKey: 'totalHours',
    header: () => <span className="whitespace-nowrap">Total Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.totalHours}</span>
    )
  },
  {
    accessorKey: 'late',
    header: 'Late',
    cell: ({ row }) => <span className="tabular-nums">{row.original.late}</span>
  },
  {
    accessorKey: 'earlyOut',
    header: () => <span className="whitespace-nowrap">Early Out</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.earlyOut}</span>
    )
  },
  {
    accessorKey: 'overtime',
    header: 'Overtime',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.overtime}</span>
    )
  },
  {
    accessorKey: 'status',
    header: () => <span className="whitespace-nowrap">Attendance Status</span>,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium whitespace-nowrap',
          STATUS_STYLES[row.original.status] ?? STATUS_STYLES.incomplete
        )}
      >
        {row.original.statusLabel}
      </Badge>
    )
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => <span className="text-xs">{row.original.source}</span>
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[12rem] text-muted-foreground">
        {row.original.remarks}
      </span>
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          asChild
        >
          <Link
            href={`/attendance-corrections?staffId=${row.original.staffId}`}
            aria-label={`View corrections for ${row.original.staffCode}`}
          >
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          asChild
        >
          <Link
            href="/attendance-corrections"
            aria-label={`Correct attendance for ${row.original.staffCode}`}
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground"
          asChild
        >
          <Link
            href={`/attendance-corrections?staffId=${row.original.staffId}`}
            aria-label={`History for ${row.original.staffCode}`}
          >
            <History className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false
  }
];
