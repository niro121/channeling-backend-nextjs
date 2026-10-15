'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AgencyBook } from '@/types/agencybook';
import AgencyBookRecordActions from './record-actions';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';

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
      const name = (row.original as { updatedUser?: { name?: string | null } }).updatedUser?.name ?? '—';
      const date = (row.original as { updatedAt?: Date }).updatedAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const name = (row.original as { createdUser?: { name?: string | null } }).createdUser?.name ?? '—';
      const date = (row.original as { createdAt?: Date }).createdAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <AgencyBookRecordActions row={row} />
  }
];

