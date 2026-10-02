'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import type {
  LeaveApplicationRecord,
  LeaveApplicationStatus
} from '@/types/leave';
import LeaveApplicationRecordActions from './record-actions';
import { LeaveApplicationStaffCodeCell } from './staff-code-cell';

export type { LeaveApplicationRecord, LeaveApplicationStatus };

type LeaveApplicationColumnsOptions = {
  onEdit?: (record: LeaveApplicationRecord) => void;
  onDeleted?: () => void;
};

const statusVariant: Record<
  LeaveApplicationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  cancelled: 'outline'
};

export function createLeaveApplicationColumns(
  options?: LeaveApplicationColumnsOptions
): ColumnDef<LeaveApplicationRecord>[] {
  return [
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
      accessorKey: 'formNumber',
      header: 'Form No',
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium tabular-nums">
          {row.original.formNumber || '—'}
        </span>
      )
    },
    {
      accessorKey: 'staffCode',
      header: 'Staff Code',
      cell: ({ row }) => (
        <LeaveApplicationStaffCodeCell record={row.original} />
      )
    },
    {
      accessorKey: 'staffName',
      header: 'Staff',
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('staffName')}</span>
      )
    },
    {
      accessorKey: 'leaveType',
      header: 'Leave Type',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('leaveType')}</span>
      )
    },
    {
      accessorKey: 'fromDate',
      header: 'From',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {row.getValue('fromDate')}
        </span>
      )
    },
    {
      accessorKey: 'toDate',
      header: 'To',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {row.getValue('toDate')}
        </span>
      )
    },
    {
      accessorKey: 'days',
      header: 'Days',
      cell: ({ row }) => {
        const days = row.original.days;
        const session =
          row.original.halfDaySession === 'AM'
            ? 'Morning'
            : row.original.halfDaySession === 'PM'
              ? 'Afternoon'
              : null;
        return (
          <span className="tabular-nums">
            {days}
            {session ? (
              <span className="ml-1 text-xs text-muted-foreground">
                ({session})
              </span>
            ) : null}
          </span>
        );
      }
    },
    {
      id: 'approved',
      header: 'Approved',
      cell: ({ row }) => {
        const date = row.original.approvedAt;
        const approvedBy = row.original.approverName;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs">{approvedBy || '—'}</span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDateTime(date)}
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as LeaveApplicationStatus;
        return (
          <Badge
            variant={statusVariant[status] ?? 'secondary'}
            className={
              status === 'approved'
                ? 'border-0 bg-primary/10 capitalize text-primary hover:bg-primary/20'
                : 'capitalize'
            }
          >
            {status}
          </Badge>
        );
      }
    },
    {
      id: 'outWithCancel',
      header: 'Out w/ Cancel',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.outWithCancel ? 'Yes' : 'No'}
        </span>
      )
    },
    {
      accessorKey: 'shiftDate',
      header: 'Shift Date',
      cell: ({ row }) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {row.getValue('shiftDate')}
        </span>
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
            <span className="whitespace-nowrap text-xs text-muted-foreground">
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
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDateTime(date)}
            </span>
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <LeaveApplicationRecordActions
          row={row}
          onEdit={options?.onEdit}
          onDeleted={options?.onDeleted}
        />
      ),
      enableHiding: false
    }
  ];
}
