'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { format, parseISO, isValid } from 'date-fns';
import {
  ROSTER_AMENDMENT_TYPE_OPTIONS,
  type RosterAmendmentRecord,
  type RosterAmendmentStatus
} from '@/types/roster';
import AmendmentRecordActions from './record-actions';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value.slice(0, 10));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

const TYPE_LABELS = Object.fromEntries(
  ROSTER_AMENDMENT_TYPE_OPTIONS.map((option) => [option.id, option.name])
);

const STATUS_STYLES: Record<RosterAmendmentStatus, string> = {
  pending_approval: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted'
};

const STATUS_LABELS: Record<RosterAmendmentStatus, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft'
};

export const amendmentColumns: ColumnDef<RosterAmendmentRecord>[] = [
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
    header: () => <span className="whitespace-nowrap">Amendment No</span>,
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
    accessorKey: 'dutyDate',
    header: () => <span className="whitespace-nowrap">Roster Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDisplayDate(row.original.dutyDate)}
      </span>
    )
  },
  {
    accessorKey: 'originalShiftLabel',
    header: () => <span className="whitespace-nowrap">Original Shift</span>,
    cell: ({ row }) => <span>{row.original.originalShiftLabel}</span>
  },
  {
    accessorKey: 'amendedShiftLabel',
    header: () => <span className="whitespace-nowrap">Amended Shift</span>,
    cell: ({ row }) => <span>{row.original.amendedShiftLabel || '—'}</span>
  },
  {
    accessorKey: 'amendmentType',
    header: () => <span className="whitespace-nowrap">Amendment Type</span>,
    cell: ({ row }) => (
      <span>
        {TYPE_LABELS[row.original.amendmentType] ?? row.original.amendmentType}
      </span>
    )
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.reason}</span>
    )
  },
  {
    accessorKey: 'requestedByName',
    header: () => <span className="whitespace-nowrap">Requested By</span>,
    cell: ({ row }) => <span>{row.original.requestedByName || '—'}</span>
  },
  {
    accessorKey: 'status',
    header: () => <span className="whitespace-nowrap">Approval Status</span>,
    cell: ({ row }) => {
      const status = row.original.status as RosterAmendmentStatus;
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
    cell: ({ row }) => <AmendmentRecordActions record={row.original} />,
    enableHiding: false
  }
];
