'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@archmage/ui';
import { formatDateTime } from '@/lib/utils/date';
import OvertimeRecordActions from './record-actions';
import type {
  OvertimeRequestSample,
  OvertimeRequestStatus
} from './sample-data';

const statusClassName: Record<OvertimeRequestStatus, string> = {
  pending: 'border-0 bg-orange-100 capitalize text-orange-700 hover:bg-orange-100',
  approved:
    'border-0 bg-emerald-100 capitalize text-emerald-700 hover:bg-emerald-100',
  rejected: 'border-0 bg-red-100 capitalize text-red-700 hover:bg-red-100',
  cancelled: 'border-0 capitalize'
};

export const overtimeRequestColumns: ColumnDef<OvertimeRequestSample>[] = [
  {
    accessorKey: 'staffName',
    header: 'Staff',
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <span className="font-medium text-foreground">
          {row.original.staffName}
        </span>
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {row.original.staffCode || '—'}
        </span>
      </div>
    )
  },
  {
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('department')}</span>
    )
  },
  {
    accessorKey: 'otDate',
    header: 'Date',
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(row.original.otDate, 'd MMM yyyy')}
      </span>
    )
  },
  {
    accessorKey: 'hours',
    header: 'Hours',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.hours}h</span>
    )
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('reason')}</span>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as OvertimeRequestStatus;
      return (
        <Badge variant="secondary" className={statusClassName[status]}>
          {status}
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <OvertimeRecordActions record={row.original} />,
    enableHiding: false
  }
];
