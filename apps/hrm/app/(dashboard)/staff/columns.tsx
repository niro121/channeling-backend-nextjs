'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { Staff } from '@/types/staff';
import { CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

function formatDateTime(date?: Date | string | null) {
  if (!date) return '—';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return format(parsed, 'dd/MM/yyyy hh:mm a');
}

export const staffColumns: ColumnDef<Staff>[] = [
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
  }
];
