'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import ShiftTypeRecordActions from './record-actions';
import type { ShiftTypeSample } from './sample-data';

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'rounded-full border-0 font-medium',
        value
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
          : 'bg-muted text-muted-foreground hover:bg-muted'
      )}
    >
      {value ? 'Yes' : 'No'}
    </Badge>
  );
}

export const shiftTypeColumns: ColumnDef<ShiftTypeSample>[] = [
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
    header: () => <span className="whitespace-nowrap">Shift Code</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.code}</span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Shift Name',
    cell: ({ row }) => <span>{row.original.name}</span>
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.category}</span>
    )
  },
  {
    accessorKey: 'startTime',
    header: () => <span className="whitespace-nowrap">Start Time</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.startTime}</span>
    )
  },
  {
    accessorKey: 'endTime',
    header: () => <span className="whitespace-nowrap">End Time</span>,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.endTime}</span>
    )
  },
  {
    accessorKey: 'durationHours',
    header: 'Duration',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.durationHours.toFixed(1)} h
      </span>
    )
  },
  {
    accessorKey: 'isNightShift',
    header: () => <span className="whitespace-nowrap">Night Shift</span>,
    cell: ({ row }) => <YesNoBadge value={row.original.isNightShift} />
  },
  {
    accessorKey: 'isOvernight',
    header: () => <span className="whitespace-nowrap">Overnight</span>,
    cell: ({ row }) => <YesNoBadge value={row.original.isOvernight} />
  },
  {
    accessorKey: 'holidayEligible',
    header: () => <span className="whitespace-nowrap">Holiday Eligible</span>,
    cell: ({ row }) => <YesNoBadge value={row.original.holidayEligible} />
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const active = row.original.status === 'active';
      return (
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full border-0 font-medium capitalize',
            active
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
              : 'bg-muted text-muted-foreground hover:bg-muted'
          )}
        >
          {row.original.status}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedBy || '—'}</span>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
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
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.createdAt)}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <ShiftTypeRecordActions record={row.original} />,
    enableHiding: false
  }
];
