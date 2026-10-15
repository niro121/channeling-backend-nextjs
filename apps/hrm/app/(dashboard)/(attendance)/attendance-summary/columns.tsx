'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import { Button } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import type { AttendanceSummaryRow } from '@/types/attendance';
import { useAttendanceSummaryUi } from './attendance-summary-ui-context';

function AuditCell({
  name,
  at
}: {
  name?: string | null;
  at?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs">{name?.trim() || 'Attendance Engine'}</span>
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTime(at)}
      </span>
    </div>
  );
}

function SummaryRecordActions({ record }: { record: AttendanceSummaryRow }) {
  const { openDetail } = useAttendanceSummaryUi();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 gap-1.5 text-primary"
      onClick={() => openDetail(record)}
    >
      <Eye className="h-4 w-4" />
      View Details
    </Button>
  );
}

export const attendanceSummaryColumns: ColumnDef<AttendanceSummaryRow>[] = [
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
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.department || '—'}
      </span>
    )
  },
  {
    accessorKey: 'workingDays',
    header: () => <span className="whitespace-nowrap">Working Days</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.workingDays}</span>
    )
  },
  {
    accessorKey: 'presentDays',
    header: () => <span className="whitespace-nowrap">Present Days</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.presentDays}</span>
    )
  },
  {
    accessorKey: 'absentDays',
    header: () => <span className="whitespace-nowrap">Absent Days</span>,
    cell: ({ row }) => (
      <span
        className={`tabular-nums ${row.original.absentDays > 0 ? 'font-semibold text-red-600' : ''}`}
      >
        {row.original.absentDays}
      </span>
    )
  },
  {
    accessorKey: 'leaveDays',
    header: () => <span className="whitespace-nowrap">Leave Days</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.leaveDays}</span>
    )
  },
  {
    accessorKey: 'holidayDays',
    header: 'Holidays',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.holidayDays}</span>
    )
  },
  {
    accessorKey: 'dayOffDays',
    header: () => <span className="whitespace-nowrap">Days Off</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.dayOffDays}</span>
    )
  },
  {
    accessorKey: 'lateCount',
    header: () => <span className="whitespace-nowrap">Late Count</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.lateCount}</span>
    )
  },
  {
    accessorKey: 'earlyOutCount',
    header: () => <span className="whitespace-nowrap">Early Out</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.earlyOutCount}</span>
    )
  },
  {
    accessorKey: 'overtimeHours',
    header: () => <span className="whitespace-nowrap">Overtime Hours</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.overtimeHours > 0
          ? row.original.overtimeHours.toFixed(1)
          : '0'}
      </span>
    )
  },
  {
    accessorKey: 'missingPunches',
    header: () => <span className="whitespace-nowrap">Missing Punches</span>,
    cell: ({ row }) => (
      <span
        className={`tabular-nums ${row.original.missingPunches > 0 ? 'font-semibold text-red-600' : ''}`}
      >
        {row.original.missingPunches}
      </span>
    )
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <AuditCell
        name={row.original.createdUser?.name}
        at={row.original.createdAt}
      />
    )
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <AuditCell
        name={row.original.updatedUser?.name}
        at={row.original.updatedAt}
      />
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <SummaryRecordActions record={row.original} />,
    enableHiding: false
  }
];
