'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Agency } from '@/types/agency';
import AgencyRecordActions from './record-actions';
import { CircleCorrect, CircleX } from '@/components/icons';

export const AgencyColumns: ColumnDef<Agency>[] = [
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
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => {
      const code = row.getValue('code') as string;
      return code || <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'name',
    header: 'Agency Name'
  },
  {
    accessorKey: 'chequePrintingName',
    header: 'Cheque Printing Name'
  },
  {
    id: 'parentAgency',
    header: 'Parent Agency',
    cell: ({ row }) => {
      const parentAgency = row.original.parentAgency;
      return parentAgency ? (
        <span>{parentAgency.name}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    }
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string;
      return email || <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string;
      return phone || <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const balance = row.getValue('balance') as number;
      return <span>{balance?.toFixed(2) || '0.00'}</span>;
    }
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
    cell: ({ row }) => <AgencyRecordActions row={row} />
  }
];
