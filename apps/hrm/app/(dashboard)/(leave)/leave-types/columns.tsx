'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';
import type { LeaveTypeRecord } from '@/types/leave';
import LeaveTypeRecordActions from './record-actions';
import { LeaveTypeCodeCell } from './leave-type-code-cell';

export type { LeaveTypeRecord };

function BooleanBadge({
  value,
  trueLabel = 'Yes',
  falseLabel = 'No'
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <Badge
      variant={value ? 'default' : 'secondary'}
      className={
        value
          ? 'bg-primary/10 text-primary hover:bg-primary/20 border-0'
          : 'bg-muted text-muted-foreground hover:bg-muted'
      }
    >
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

export const leaveTypeColumns: ColumnDef<LeaveTypeRecord>[] = [
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
      <LeaveTypeCodeCell
        id={row.original.id}
        code={row.getValue('code') as string}
      />
    )
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span>{row.getValue('name') as string}</span>
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const isPublished = (row.getValue('status') as number) === 1;
      return (
        <Badge
          variant={isPublished ? 'default' : 'secondary'}
          className={
            isPublished
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
          }
        >
          {isPublished ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {isPublished ? 'Published' : 'Unpublished'}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'isPaid',
    header: 'Type',
    cell: ({ row }) => (
      <BooleanBadge
        value={row.getValue('isPaid') as boolean}
        trueLabel="Paid"
        falseLabel="Unpaid"
      />
    )
  },
  {
    accessorKey: 'requiresApproval',
    header: 'Approval',
    cell: ({ row }) => (
      <BooleanBadge value={row.getValue('requiresApproval') as boolean} />
    )
  },
  {
    accessorKey: 'allowHalfDay',
    header: 'Half-day',
    cell: ({ row }) => (
      <BooleanBadge value={row.getValue('allowHalfDay') as boolean} />
    )
  },
  {
    accessorKey: 'carryForwardAllowed',
    header: 'Carry Fwd',
    cell: ({ row }) => (
      <BooleanBadge value={row.getValue('carryForwardAllowed') as boolean} />
    )
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
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <LeaveTypeRecordActions row={row} />
  }
];
