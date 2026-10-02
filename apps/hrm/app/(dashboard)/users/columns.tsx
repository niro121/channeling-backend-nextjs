'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { CheckCircle2, XCircle } from 'lucide-react';
import { userTypes } from '@archmage/shared';
import { formatDateTime } from '@/lib/utils/date';
import type { HrmUser } from '@/types/user';
import UserRecordActions from './record-actions';

export const userColumns: ColumnDef<HrmUser>[] = [
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
        disabled={row.original.userType === userTypes.admin}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'User Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    id: 'userGroup',
    header: 'User Group',
    cell: ({ row }) => {
      if (row.original.userType === userTypes.admin) {
        return <span className="text-xs text-muted-foreground whitespace-nowrap">Platform Admin</span>;
      }
      return row.original.userGroup?.name ?? '—';
    },
  },
  {
    id: 'staff',
    header: () => <span className="text-xs text-muted-foreground whitespace-nowrap">Linked Staff</span>,
    cell: ({ row }) => {
      const staff = row.original.staff;
      if (!staff?.name) return '—';
      return staff.code ? `${staff.name} (${staff.code})` : staff.name;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = (row.getValue('status') as number) === 1;
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
    },
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <UserRecordActions row={row} />,
  },
];
