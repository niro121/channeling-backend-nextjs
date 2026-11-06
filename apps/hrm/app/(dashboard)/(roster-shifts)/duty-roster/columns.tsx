'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { formatDutyDateLabel } from '@/lib/utils/duty-roster-view';
import type { DutyAttendance, DutyRosterRow } from '@/types/roster';
import DutyRecordActions from './record-actions';

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  amended: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted'
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Published',
  amended: 'Amended',
  draft: 'Draft'
};

const ATTENDANCE_STYLES: Record<DutyAttendance, string> = {
  present: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  late: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  absent: 'bg-red-100 text-red-700 hover:bg-red-100'
};

const ATTENDANCE_LABELS: Record<DutyAttendance, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent'
};

function isAttendance(value: string | null | undefined): value is DutyAttendance {
  return value === 'present' || value === 'late' || value === 'absent';
}

export function getDutyRosterColumns(options?: {
  /** When grouped by staff, omit per-row Staff ID / Name (shown on group header). */
  groupedByStaff?: boolean;
}): ColumnDef<DutyRosterRow>[] {
  const groupedByStaff = options?.groupedByStaff === true;
  const staffColumns: ColumnDef<DutyRosterRow>[] = groupedByStaff
    ? [
        {
          id: 'staffId',
          accessorKey: 'staffId',
          header: 'Staff',
          enableHiding: true
        }
      ]
    : [
        {
          accessorKey: 'staffCode',
          header: () => <span className="whitespace-nowrap">Staff ID</span>,
          cell: ({ row }) => (
            <span className="font-medium tabular-nums">
              {row.original.staffCode}
            </span>
          )
        },
        {
          accessorKey: 'staffName',
          header: 'Staff Name',
          cell: ({ row }) => <span>{row.original.staffName}</span>
        }
      ];

  return [...staffColumns, ...dutyRosterShiftColumns];
}

const dutyRosterShiftColumns: ColumnDef<DutyRosterRow>[] = [
  {
    accessorKey: 'shiftName',
    header: 'Shift',
    cell: ({ row }) => <span className='whitespace-nowrap font-medium'>{row.original.shiftName}</span>
  },
  {
    id: 'date',
    accessorFn: (row) => row.date?.slice(0, 10) ?? '',
    header: () => <span className="whitespace-nowrap">Duty Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium tabular-nums">
        {formatDutyDateLabel(row.original.date)}
      </span>
    )
  },
  {
    accessorKey: 'startTime',
    header: () => <span className="whitespace-nowrap">Start Time</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium tabular-nums">{row.original.startTime}</span>
    )
  },
  {
    accessorKey: 'endTime',
    header: () => <span className="whitespace-nowrap">End Time</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-medium tabular-nums">{row.original.endTime}</span>
    )
  },
  {
    accessorKey: 'dutyLocation',
    header: () => <span className="whitespace-nowrap">Duty Department</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.dutyLocation || '—'}
      </span>
    )
  },
  {
    accessorKey: 'wardUnit',
    header: () => <span className="whitespace-nowrap">Room / Unit</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.wardUnit || '—'}
      </span>
    )
  },
  {
    accessorKey: 'supervisorName',
    header: 'Supervisor',
    cell: ({ row }) => <span>{row.original.supervisorName || '—'}</span>
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = String(row.original.status || 'draft');
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium',
            STATUS_STYLES[status] ?? STATUS_STYLES.draft
          )}
        >
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'attendance',
    header: 'Attendance',
    cell: ({ row }) => {
      const attendance = row.original.attendance;
      if (!isAttendance(attendance)) {
        return <span className="text-xs text-muted-foreground">—</span>;
      }
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium',
            ATTENDANCE_STYLES[attendance]
          )}
        >
          {ATTENDANCE_LABELS[attendance]}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">
          {row.original.updatedUser?.name || row.original.updatedBy || '—'}
        </span>
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
        <span className="text-xs">
          {row.original.createdUser?.name || row.original.createdBy || '—'}
        </span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <DutyRecordActions record={row.original} />,
    enableHiding: false
  }
];
