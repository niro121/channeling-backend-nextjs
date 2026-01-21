'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { CircleCorrect, CircleX } from '@/components/icons';
import moment from 'moment';
import { DiscountRecordActions } from './record-actions';
import {
  Discount,
  DISCOUNT_TYPE_OPTIONS,
  APPLY_TO_OPTIONS,
  DISCOUNT_METHOD_OPTIONS
} from '@/types/discount';

export const DisCountColumns: ColumnDef<Discount>[] = [
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
    accessorKey: 'name',
    header: 'Discount Name'
  },
  {
    accessorKey: 'discountType',
    header: 'Discount Type',
    cell: ({ row }) => {
      const name =
        DISCOUNT_TYPE_OPTIONS.find(
          (type) => type.id === row.getValue('discountType')?.toString()
        )?.name || 'Unknown';

      return name;
    }
  },
  {
    accessorKey: 'discountValue',
    header: 'Discount Value'
  },
  {
    accessorKey: 'discountValueForeign',
    header: 'Discount Foreign Value'
  },
  /* {
    accessorKey: 'updatedUser.name',
    header: 'Updated By'
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated Date',
    cell: ({ row }) => {
      return moment(row.getValue('updatedAt')).format('DD/MM/YYYY');
    }
  },
  {
    accessorKey: 'createdUser.name',
    header: 'Created By'
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ row }) => {
      return moment(row.getValue('createdAt')).format('DD/MM/YYYY');
    }
  }, */
  {
    accessorKey: 'status',
    header: 'Published',
    cell: ({ row }) => {
      const show = row.getValue('status');
      return show === 1 ? (
        <CircleCorrect className="text-green-500 w-7 h-7 justify-self-center" />
      ) : (
        <CircleX className="text-red-500 w-7 h-7 justify-self-center" />
      );
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <DiscountRecordActions row={row} />
  }
];
