'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { format, parseISO, isValid } from 'date-fns';
import {
  ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS,
  ATTENDANCE_CORRECTION_STATUS_OPTIONS,
  type AttendanceCorrectionRecord,
  type AttendanceCorrectionStatus
} from '@/types/attendance';
import CorrectionRecordActions from './record-actions';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value.slice(0, 10));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

const DAY_STATUS_LABELS = Object.fromEntries(
  ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS.map((o) => [o.id, o.name])
);

const STATUS_STYLES: Record<AttendanceCorrectionStatus, string> = {
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
  pending_approval: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  cancelled: 'bg-slate-100 text-slate-600 hover:bg-slate-100'
};

const STATUS_LABELS = Object.fromEntries(
  ATTENDANCE_CORRECTION_STATUS_OPTIONS.map((o) => [o.id, o.name])
) as Record<AttendanceCorrectionStatus, string>;

export const correctionColumns: ColumnDef<AttendanceCorrectionRecord>[] = [
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
    accessorKey: 'code',
    header: () => <span className="whitespace-nowrap">Correction ID</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.code}</span>
    )
  },
  {
    accessorKey: 'staffCode',
    header: () => <span className="whitespace-nowrap">Staff ID</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.staffCode}</span>
    )
  },
  {
    accessorKey: 'staffName',
    header: 'Staff Name',
    cell: ({ row }) => <span>{row.original.staffName}</span>
  },
  {
    accessorKey: 'date',
    header: () => <span className="whitespace-nowrap">Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDisplayDate(row.original.date)}
      </span>
    )
  },
  {
    id: 'original',
    header: () => <span className="whitespace-nowrap">Original</span>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 text-xs">
        <span>
          In {row.original.originalFirstInLabel} · Out{' '}
          {row.original.originalLastOutLabel}
        </span>
        <span className="text-muted-foreground">
          {DAY_STATUS_LABELS[row.original.originalStatus] ??
            (row.original.originalStatus || '—')}
        </span>
      </div>
    )
  },
  {
    id: 'corrected',
    header: () => <span className="whitespace-nowrap">Corrected</span>,
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5 text-xs">
        <span>
          In {row.original.correctedFirstInLabel} · Out{' '}
          {row.original.correctedLastOutLabel}
        </span>
        <span className="text-muted-foreground">
          {DAY_STATUS_LABELS[row.original.correctedStatus] ??
            row.original.correctedStatus}
        </span>
      </div>
    )
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-[14rem] text-muted-foreground">
        {row.original.reason}
      </span>
    )
  },
  {
    accessorKey: 'requestedByName',
    header: () => <span className="whitespace-nowrap">Requested By</span>,
    cell: ({ row }) => (
      <span className="text-xs">{row.original.requestedByName || '—'}</span>
    )
  },
  {
    accessorKey: 'status',
    header: () => <span className="whitespace-nowrap">Status</span>,
    cell: ({ row }) => {
      const status = row.original.status as AttendanceCorrectionStatus;
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium whitespace-nowrap',
            STATUS_STYLES[status] ?? STATUS_STYLES.draft
          )}
        >
          {STATUS_LABELS[status] ?? status}
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
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <CorrectionRecordActions record={row.original} />,
    enableHiding: false
  }
];
