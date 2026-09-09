'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDate } from '@/lib/utils/date';
import type { LeaveEntitlementRecord } from '@/types/leave';
import LeaveEntitlementRecordActions from './record-actions';

export type { LeaveEntitlementRecord };

type LeaveEntitlementColumnsOptions = {
  onEdit?: (record: LeaveEntitlementRecord) => void;
  onDeleted?: () => void;
};

export function createLeaveEntitlementColumns(
  options?: LeaveEntitlementColumnsOptions
): ColumnDef<LeaveEntitlementRecord>[] {
  return [
    {
      id: 'staffName',
      accessorFn: (row) => {
        const name = row.staffName?.trim() || 'Unknown employee';
        const code = row.staffCode?.trim();
        return code ? `${name} (${code})` : name;
      },
      header: 'Employee',
      enableHiding: false,
      cell: ({ getValue }) => (
        <span className="font-medium">{String(getValue() ?? '-')}</span>
      )
    },
    {
      accessorKey: 'leaveTypeName',
      header: 'Leave Type',
      cell: ({ row }) => (
        <span className="font-medium">
          {(row.getValue('leaveTypeName') as string) || '-'}
        </span>
      )
    },
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDate(row.original.fromDate)} – {formatDate(row.original.toDate)}
        </span>
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
        const status = row.getValue('status') as string;
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
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <LeaveEntitlementRecordActions
          row={row}
          onEdit={options?.onEdit}
          onDeleted={options?.onDeleted}
        />
      ),
      enableHiding: false
    }
  ];
}

/** Static columns for server tables that don't need edit callbacks. */
export const leaveEntitlementColumns = createLeaveEntitlementColumns();
