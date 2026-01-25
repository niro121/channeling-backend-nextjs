'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag } from '@/types/tag';
import TagRecordActions from './record-actions';
import { CircleCorrect, CircleX } from '@/components/icons';
import { Badge } from '@/components/ui/badge';

const TAG_TYPES: Record<number, string> = {
  1: 'Area',
  2: 'Bank',
  3: 'Staff Category',
  4: 'Staff Designation',
  5: 'Staff Grade'
};

// DEFINE THE COLUMNS OF THE TAG TABLE
export const tagColumns: ColumnDef<Tag>[] = [
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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const typeMs = row.getValue('type') as number;
      return TAG_TYPES[typeMs] ?? 'Unknown';
    }
  },

  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status');
      return status === 1 ? (
        <CircleCorrect className="text-green-500 w-7 h-7" />
      ) : (
        <CircleX className="text-red-500 w-7 h-7" />
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <TagRecordActions row={row} />
  }
];
