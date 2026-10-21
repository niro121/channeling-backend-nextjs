'use client';

import { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';

export type UserActivityRow = {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  importance: string | null;
  createdAt: Date;
};

export const UserActivityReportColumns: ColumnDef<UserActivityRow>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date & Time',
    cell: ({ row }) => {
      const date = row.getValue<Date>('createdAt');
      if (!date) return '-';
      return (
        <div className="flex flex-col min-w-[140px]">
          <span>{moment(date).format('YYYY-MM-DD')}</span>
          <span className="text-muted-foreground text-xs">{moment(date).format('HH:mm:ss')}</span>
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
      return id ? <span className="truncate max-w-[120px] block" title={id}>{id}</span> : '-';
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
