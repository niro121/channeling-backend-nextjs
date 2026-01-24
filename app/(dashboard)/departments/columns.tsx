'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Department } from '@/types/department';
import DepartmentRecordActions from './record-actions';
import { CircleCorrect, CircleX } from '@/components/icons';

// DEFINE THE COLUMNS OF THE DEPARTMENT TABLE
export const departmentColumns: ColumnDef<Department>[] = [
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
    header: 'Department Name'
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const description = row.getValue('description') as string;
      return description ? (
        <span className="max-w-[300px] truncate">{description}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    }
  },
  {
    accessorKey: 'visibility',
    header: 'Visibility',
    cell: ({ row }) => {
      const visibility = row.getValue('visibility');
      return visibility === 1 ? (
        <CircleCorrect className="text-green-500 w-7 h-7" />
      ) : (
        <CircleX className="text-red-500 w-7 h-7" />
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <DepartmentRecordActions row={row} />
  }
];
