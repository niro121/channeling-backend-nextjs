'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
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
  {
      id: 'updated',
      header: 'Updated',
      cell: ({ row }) => {
        const name = row.original.updatedUser?.name ?? '—';
        const date = row.original.updatedAt
          ? moment(row.original.updatedAt).format('DD/MM/YYYY hh:mm A')
          : '—';
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <span>{name}</span>
            <span className="text-muted-foreground">{date}</span>
          </div>
        );
      }
    },
    {
      id: 'created',
      header: 'Created',
      cell: ({ row }) => {
        const name = row.original.createdUser?.name ?? '—';
        const date = row.original.createdAt
          ? moment(row.original.createdAt).format('DD/MM/YYYY hh:mm A')
          : '—';
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <span>{name}</span>
            <span className="text-muted-foreground">{date}</span>
          </div>
        );
      }
    },
  {
    accessorKey: 'status',
    header: 'Published',
    cell: ({ row }) => {
      const status = row.getValue('status') as number;
      const isActive = status === 1;
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
          }
        >
          {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isActive ? 'Published' : 'Unpublished'}
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <DiscountRecordActions row={row} />
  }
];
