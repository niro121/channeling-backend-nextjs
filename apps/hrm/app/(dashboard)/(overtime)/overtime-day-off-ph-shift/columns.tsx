'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatDateTime } from '@/lib/utils/date';
import ExtraShiftRecordActions from './record-actions';
import { ExtraShiftStaffCell } from './staff-cell';
import type { ExtraShiftRecord } from './sample-data';

type ExtraShiftColumnsOptions = {
  onEdit?: (record: ExtraShiftRecord) => void;
};

export function createExtraShiftColumns(
  options?: ExtraShiftColumnsOptions
): ColumnDef<ExtraShiftRecord>[] {
  return [
    {
      accessorKey: 'formNumber',
      header: 'ID',
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {row.original.formNumber}
        </span>
      )
    },
    {
      accessorKey: 'staffName',
      header: 'Staff',
      cell: ({ row }) => <ExtraShiftStaffCell record={row.original} />
    },
    {
      accessorKey: 'shiftType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{row.original.shiftType}</span>
      )
    },
    {
      accessorKey: 'roster',
      header: 'Roster',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.roster}</span>
      )
    },
    {
      accessorKey: 'fromAt',
      header: 'From',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDateTime(row.original.fromAt, 'd MMM yyyy HH:mm')}
        </span>
      )
    },
    {
      accessorKey: 'toAt',
      header: 'To',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatDateTime(row.original.toAt, 'd MMM yyyy HH:mm')}
        </span>
      )
    },
    {
      accessorKey: 'shiftStart',
      header: 'Shift Start',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.shiftStart}</span>
      )
    },
    {
      accessorKey: 'shiftEnd',
      header: 'Shift End',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.shiftEnd}</span>
      )
    },
    {
      accessorKey: 'approverName',
      header: 'Approved By',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.approverName || '—'}
        </span>
      )
    },
    {
      accessorKey: 'comment',
      header: 'Comment',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.comment}</span>
      )
    },
    {
      id: 'updated',
      header: 'Updated',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="text-xs">{row.original.updatedByName || '—'}</span>
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
          <span className="text-xs">{row.original.createdByName || '—'}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        </div>
      )
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <ExtraShiftRecordActions row={row} onEdit={options?.onEdit} />
      ),
      enableHiding: false
    }
  ];
}
