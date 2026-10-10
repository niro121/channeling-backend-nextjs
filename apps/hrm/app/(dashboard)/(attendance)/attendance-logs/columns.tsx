'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eye, History } from 'lucide-react';
import { Badge, Button } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import type {
  AttendanceLogRecord,
  AttendanceLogStatus
} from '@/types/attendance';
import { useAttendanceLogsUi } from './attendance-logs-ui-context';

const LOG_STATUS_STYLES: Record<AttendanceLogStatus, string> = {
  pending: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-800 text-white hover:bg-emerald-800',
  recorded: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
  completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100'
};

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

function LogRecordActions({ record }: { record: AttendanceLogRecord }) {
  const { openDetail, openHistory } = useAttendanceLogsUi();
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-primary"
        aria-label={`View ${record.logCode}`}
        onClick={() => openDetail(record)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground"
        aria-label={`History for ${record.logCode}`}
        onClick={() => openHistory(record)}
      >
        <History className="h-4 w-4" />
      </Button>
    </div>
  );
}

export const attendanceLogColumns: ColumnDef<AttendanceLogRecord>[] = [
  {
    accessorKey: 'logCode',
    header: () => <span className="whitespace-nowrap">Log ID</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.logCode}</span>
    )
  },
  {
    accessorKey: 'eventDateLabel',
    header: 'Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.eventDateLabel}</span>
    )
  },
  {
    accessorKey: 'eventTimeLabel',
    header: 'Time',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.eventTimeLabel}</span>
    )
  },
  {
    accessorKey: 'staffCode',
    header: () => <span className="whitespace-nowrap">Staff Code</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.staffCode}</span>
    )
  },
  {
    accessorKey: 'staffName',
    header: () => <span className="whitespace-nowrap">Staff Name</span>,
    cell: ({ row }) => <span>{row.original.staffName}</span>
  },
  {
    accessorKey: 'attendanceDateLabel',
    header: () => <span className="whitespace-nowrap">Attendance Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.attendanceDateLabel}
      </span>
    )
  },
  {
    accessorKey: 'actionLabel',
    header: 'Action',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.actionLabel}</span>
    )
  },
  {
    accessorKey: 'previousValue',
    header: () => <span className="whitespace-nowrap">Previous Value</span>,
    cell: ({ row }) => (
      <span className="max-w-[220px] truncate text-muted-foreground">
        {row.original.previousValue}
      </span>
    )
  },
  {
    accessorKey: 'newValue',
    header: () => <span className="whitespace-nowrap">New Value</span>,
    cell: ({ row }) => (
      <span className="max-w-[220px] truncate">{row.original.newValue}</span>
    )
  },
  {
    accessorKey: 'sourceLabel',
    header: 'Source',
    cell: ({ row }) => <span>{row.original.sourceLabel}</span>
  },
  {
    accessorKey: 'performedByName',
    header: () => <span className="whitespace-nowrap">Performed By</span>,
    cell: ({ row }) => <span>{row.original.performedByName}</span>
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate text-muted-foreground">
        {row.original.remarks || '—'}
      </span>
    )
  },
  {
    accessorKey: 'logStatus',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.logStatus;
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium whitespace-nowrap',
            LOG_STATUS_STYLES[status] ?? LOG_STATUS_STYLES.recorded
          )}
        >
          {row.original.logStatusLabel}
        </Badge>
      );
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <AuditCell
        name={row.original.createdUser?.name ?? row.original.performedByName}
        at={row.original.createdAt}
      />
    )
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <AuditCell
        name={row.original.updatedUser?.name ?? row.original.performedByName}
        at={row.original.updatedAt}
      />
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <LogRecordActions record={row.original} />,
    enableHiding: false
  }
];
