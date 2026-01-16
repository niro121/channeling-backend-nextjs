'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { AgencyBook } from '@/types/agencybook';
import AgencyBookRecordActions from './record-actions';
import { CircleCorrect, CircleX } from '@/components/icons';

export const AgencyBookColumns: ColumnDef<AgencyBook>[] = [
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
    accessorKey: 'bookNumber',
    header: 'Book Number'
  },
  {
    id: 'agencyName',
    header: 'Agency Name',
    cell: ({ row }) => {
      const agencyName = row.original.agency?.name;
      return agencyName ? (
        <span>{agencyName}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    }
  },
  {
    accessorKey: 'startNumber',
    header: 'Start Number'
  },
  {
    accessorKey: 'endNumber',
    header: 'End Number'
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status');
      return status === 1 ? (
        <CircleCorrect className="text-primary w-7 h-7" />
      ) : (
        <CircleX className="text-red-500 w-7 h-7" />
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <AgencyBookRecordActions row={row} />
  }
];

