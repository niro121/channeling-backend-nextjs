'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import LeaveEntitlementRecordActions from './record-actions';

export type LeaveEntitlementRecord = {
  id: string;
  leaveType: string;
  year: number;
  entitled: number;
  used: number;
  remaining: number;
  carryForward: number;
  status: 'active' | 'expired' | 'pending';
};

export const leaveEntitlementColumns: ColumnDef<LeaveEntitlementRecord>[] = [
  {
    accessorKey: 'leaveType',
    header: 'Leave Type',
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('leaveType')}</span>
    )
  },
  {
    accessorKey: 'year',
    header: 'Year',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('year')}</span>
    )
  },
  {
    accessorKey: 'entitled',
    header: 'Entitled',
    cell: ({ row }) => <span>{row.getValue('entitled')}</span>
  },
  {
    accessorKey: 'used',
    header: 'Used',
    cell: ({ row }) => <span>{row.getValue('used')}</span>
  },
  {
    accessorKey: 'remaining',
    header: 'Remaining',
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('remaining')}</span>
    )
  },
  {
    accessorKey: 'carryForward',
    header: 'Carry Forward',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.getValue('carryForward')}
      </span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as LeaveEntitlementRecord['status'];
      const variant =
        status === 'active'
          ? 'default'
          : status === 'pending'
            ? 'secondary'
            : 'outline';

      return (
        <Badge
          variant={variant}
          className={
            status === 'active'
              ? 'bg-primary/10 text-primary hover:bg-primary/20 border-0 capitalize'
              : 'capitalize'
          }
        >
          {status}
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <LeaveEntitlementRecordActions row={row} />,
    enableHiding: false
  }
];
