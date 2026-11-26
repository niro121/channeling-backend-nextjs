'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge, Checkbox } from '@archmage/ui';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { UserGroup } from '@archmage/shared';
import UserGroupRecordActions from './record-actions';

function formatAuditDate(value?: string | Date | null) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy hh:mm a');
  } catch {
    return '—';
  }
}

export function userGroupColumns(flags: {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}): ColumnDef<UserGroup>[] {
  const columns: ColumnDef<UserGroup>[] = [];

  if (flags.canDelete) {
    columns.push({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
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
      enableHiding: false,
    });
  }

  columns.push(
    {
      accessorKey: 'name',
      header: 'Group Name',
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (row.original.description?.trim() ? row.original.description : '-'),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.status === 1;
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
      },
    },
    {
      id: 'updated',
      header: 'Updated',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{row.original.updatedUser?.name ?? '—'}</span>
          <span className="text-muted-foreground">{formatAuditDate(row.original.updatedAt)}</span>
        </div>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{row.original.createdUser?.name ?? '—'}</span>
          <span className="text-muted-foreground">{formatAuditDate(row.original.createdAt)}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => <UserGroupRecordActions row={row} {...flags} />,
    }
  );

  return columns;
}
