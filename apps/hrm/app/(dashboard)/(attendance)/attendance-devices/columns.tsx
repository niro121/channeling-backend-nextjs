'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import type { AttendanceDeviceRecord } from '@/types/attendance';
import DeviceRecordActions from './record-actions';

export const attendanceDeviceColumns: ColumnDef<AttendanceDeviceRecord>[] = [
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
    header: () => <span className="whitespace-nowrap">Device Code</span>,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.code}</span>
    )
  },
  {
    accessorKey: 'name',
    header: 'Device Name',
    cell: ({ row }) => <span>{row.original.name}</span>
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.location || '—'}
      </span>
    )
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
    accessorKey: 'lastSeenAt',
    header: () => <span className="whitespace-nowrap">Last Seen</span>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
        {row.original.lastSeenAt
          ? formatDateTime(row.original.lastSeenAt)
          : '—'}
      </span>
    )
  },
  {
    accessorKey: 'hasApiKey',
    header: () => <span className="whitespace-nowrap">API Key</span>,
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className={cn(
          'rounded-full border-0 font-medium',
          row.original.hasApiKey
            ? 'bg-sky-100 text-sky-800 hover:bg-sky-100'
            : 'bg-muted text-muted-foreground hover:bg-muted'
        )}
      >
        {row.original.hasApiKey ? 'Set' : 'None'}
      </Badge>
    )
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs">{row.original.updatedUser?.name || '—'}</span>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(row.original.updatedAt)}
        </span>
      </div>
    )
  },
  {
    id: 'actions',
    header: () => <div>Actions</div>,
    cell: ({ row }) => <DeviceRecordActions record={row.original} />,
    enableHiding: false
  }
];
