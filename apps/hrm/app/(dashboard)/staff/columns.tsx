'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { Staff } from '@/types/staff';
import { CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from '@archmage/ui';
import StaffRecordActions from './record-actions';

function formatDateTime(date?: Date | string | null) {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return format(parsed, 'dd/MM/yyyy hh:mm a');
}

export const staffColumns: ColumnDef<Staff>[] = [
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
    header: 'Name',
    cell: ({ row }) => {
      const title = row.original.title;
      const name = row.getValue('name') as string;
      return (
        <span>
          {title ? `${title} ` : ''}
          {name}
        </span>
      );
    }
  },
  {
    accessorKey: 'nic',
    header: 'NIC',
    cell: ({ row }) => {
      const nic = row.getValue('nic') as string;
      return nic || <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'contactMobile',
    header: 'Contact'
  },
  {
    accessorKey: 'status',
    header: 'Status',
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
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const date = (row.original as { updatedAt?: Date }).updatedAt;
      return <span className="text-xs text-muted-foreground">{formatDateTime(date)}</span>;
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const date = (row.original as { createdAt?: Date }).createdAt;
      return <span className="text-xs text-muted-foreground">{formatDateTime(date)}</span>;
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <StaffRecordActions row={row} />
  }
];
