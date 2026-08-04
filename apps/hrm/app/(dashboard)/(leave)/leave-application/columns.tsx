'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge, Checkbox } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import LeaveApplicationRecordActions from './record-actions';
import { LeaveApplicationStaffCodeCell } from './staff-code-cell';

export type LeaveApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LeaveApplicationRecord = {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  leaveType: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  days: number;
  approverId: string;
  approverName: string;
  status: LeaveApplicationStatus;
  outWithCancel: boolean;
  approvedAt: string | null;
  shiftDate: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdUser?: { name?: string } | null;
  updatedUser?: { name?: string } | null;
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

export const leaveApplicationColumns: ColumnDef<LeaveApplicationRecord>[] = [
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
      <span className="tabular-nums text-muted-foreground whitespace-nowrap">
        {row.getValue('fromDate')}
      </span>
    )
  },
  {
    accessorKey: 'toDate',
    header: 'To',
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground whitespace-nowrap">
        {row.getValue('toDate')}
      </span>
    )
  },
  {
    accessorKey: 'days',
    header: 'Days',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.getValue('days')}</span>
    )
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
          variant={statusVariant[status]}
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
      <span className="tabular-nums text-muted-foreground whitespace-nowrap">
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
    cell: ({ row }) => <LeaveApplicationRecordActions row={row} />,
    enableHiding: false
  }
];
