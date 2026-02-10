/* 'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { CircleCorrect, CircleX } from '@/components/icons';
import { SessionRecordActions } from './record-actions'

export const SessionColumns: ColumnDef<>[] = [
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'status',
    header: 'Published',
    cell: ({ row }) =>
      row.getValue('status') === 1 ? (
        <CircleCorrect className="text-green-500 w-7 h-7" />
      ) : (
        <CircleX className="text-red-500 w-7 h-7" />
      )
  },

  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <SessionRecordActions row={row} />
  }
];
 */