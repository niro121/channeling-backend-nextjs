'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FEE_TYPES } from '@/types/doctor.session';
import { BulkPriceChangeRecordActions, type BulkPriceChangeListRow } from './record-actions';

export const bulkPriceChangeColumns: ColumnDef<BulkPriceChangeListRow>[] = [
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
    header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>
  },
  {
    accessorKey: 'feeTypeId',
    header: 'Fee type',
    cell: ({ row }) => {
      const id = row.getValue('feeTypeId') as string;
      return FEE_TYPES.find((f) => f.id === id)?.name ?? id;
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={status === 'PROCESSED' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const d = row.getValue('createdAt');
      if (!d) return '—';
      const date = new Date(d as Date | string);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <BulkPriceChangeRecordActions row={row} />
  }
];
