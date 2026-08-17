'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { format, parseISO, isValid } from 'date-fns';
import AmendmentRecordActions from './record-actions';
import type {
  AmendmentStatus,
  RosterAmendmentSample
} from './sample-data';

function formatDisplayDate(value: string | null): string {
  if (!value) return '—';
  const parsed = parseISO(value);
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd MMM yyyy');
}

const STATUS_STYLES: Record<AmendmentStatus, string> = {
  pending_approval: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted'
};

const STATUS_LABELS: Record<AmendmentStatus, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Draft'
};

export const amendmentColumns: ColumnDef<RosterAmendmentSample>[] = [
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
    accessorKey: 'amendmentNo',
    header: () => <span className="whitespace-nowrap">Amendment No</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.amendmentNo}
      </span>
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
    accessorKey: 'rosterDate',
    header: () => <span className="whitespace-nowrap">Roster Date</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDisplayDate(row.original.rosterDate)}
      </span>
    )
  },
  {
    accessorKey: 'originalShift',
    header: () => <span className="whitespace-nowrap">Original Shift</span>,
    cell: ({ row }) => <span>{row.original.originalShift}</span>
  },
  {
    accessorKey: 'amendedShift',
    header: () => <span className="whitespace-nowrap">Amended Shift</span>,
    cell: ({ row }) => <span>{row.original.amendedShift || '—'}</span>
  },
  {
    accessorKey: 'amendmentType',
    header: () => <span className="whitespace-nowrap">Amendment Type</span>,
    cell: ({ row }) => <span>{row.original.amendmentType}</span>
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.reason}</span>
    )
  },
  {
    accessorKey: 'requestedBy',
    header: () => <span className="whitespace-nowrap">Requested By</span>,
    cell: ({ row }) => <span>{row.original.requestedBy}</span>
  },
  {
    accessorKey: 'status',
    header: () => <span className="whitespace-nowrap">Approval Status</span>,
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
    cell: ({ row }) => <AmendmentRecordActions record={row.original} />,
    enableHiding: false
  }
];
