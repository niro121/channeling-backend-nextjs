'use client';

import { format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import type { UserActivityReportRow } from '@/types/user-activity-report';

export type UserActivityRow = UserActivityReportRow;

export const UserActivityReportColumns: ColumnDef<UserActivityRow>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date & Time',
    cell: ({ row }) => {
      const date = row.getValue<Date>('createdAt');
      if (!date) return '-';
      return (
        <div className="flex min-w-[140px] flex-col">
          <span>{format(date, 'yyyy-MM-dd')}</span>
          <span className="text-xs text-muted-foreground">{format(date, 'HH:mm:ss')}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'userName',
    header: 'User',
    cell: ({ row }) => row.getValue<string>('userName') ?? '-',
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue<string>('action')}</span>
    ),
  },
  {
    accessorKey: 'entityType',
    header: 'Entity Type',
    cell: ({ row }) => row.getValue<string>('entityType') ?? '-',
  },
  {
    accessorKey: 'entityId',
    header: 'Entity ID',
    cell: ({ row }) => {
      const id = row.getValue<string>('entityId');
      return id ? (
        <span className="block max-w-[120px] truncate" title={id}>
          {id}
        </span>
      ) : (
        '-'
      );
    },
  },
  {
    accessorKey: 'ipAddress',
    header: 'IP Address',
    cell: ({ row }) => row.getValue<string>('ipAddress') ?? '-',
  },
  {
    accessorKey: 'importance',
    header: 'Importance',
    cell: ({ row }) => row.getValue<string>('importance') ?? '-',
  },
];
