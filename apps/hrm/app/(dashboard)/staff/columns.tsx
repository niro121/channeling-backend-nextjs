'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { StaffWithAuthUsers } from '@/types/staff';
import { CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';
import StaffRecordActions from './record-actions';
import { StaffCodeCell } from './staff-code-cell';

export const staffColumns: ColumnDef<StaffWithAuthUsers>[] = [
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
    cell: ({ row }) => (
      <StaffCodeCell id={row.original.id} code={row.getValue('code') as string} />
    )
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
      return (
        <span className="text-muted-foreground whitespace-nowrap">
          {nic || '-'}
        </span>
      );
    }
  },
  {
    accessorKey: 'contactMobile',
    header: 'Contact',
    cell: ({ row }) => {
      const contactMobile = row.getValue('contactMobile') as string;
      return (
        <span className="text-muted-foreground whitespace-nowrap">
          {contactMobile || '-'}
        </span>
      );
    }
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
          {isActive ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {isActive ? 'Published' : 'Unpublished'}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const date = row.original.updatedAt;
      const updatedBy = row.original.updatedUser?.name;
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs">{updatedBy || '—'}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(date)}
          </span>
        </div>
      );
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.original.createdAt;
      const createdBy = row.original.createdUser?.name;
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs">{createdBy || '—'}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDateTime(date)}
          </span>
        </div>
      )
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <StaffRecordActions row={row} />
  }
];
