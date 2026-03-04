'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { SHIFT_STATUS } from '@/types/shift';
import moment from 'moment';

export type ShiftListRow = {
  id: string;
  userId: string;
  startedAt: Date;
  endsAt: Date;
  status: number;
  createdAt: Date;
  endedAt: Date | null;
  user: { id: string; name: string; email: string | null };
  location: { id: string; name: string } | null;
};

const statusLabel: Record<number, string> = {
  [SHIFT_STATUS.PAUSED]: 'Paused',
  [SHIFT_STATUS.ACTIVE]: 'Active',
  [SHIFT_STATUS.ENDED]: 'Ended',
};

export const ShiftColumns: ColumnDef<ShiftListRow>[] = [
  {
    accessorKey: 'startedAt',
    header: 'Started',
    cell: ({ row }) => {
      const id = row.original.id;
      const startedAt = row.original.startedAt;
      const content = startedAt
        ? moment(startedAt).format('DD/MM/YYYY HH:mm')
        : '—';
      return (
        <Link
          href={`/shifts/${id}`}
          className="text-primary hover:underline underline-offset-2 cursor-pointer"
          title="View shift details"
        >
          {content}
        </Link>
      );
    },
  },
  {
    id: 'user',
    header: 'User',
    cell: ({ row }) => {
      const user = row.original.user;
      return (
        <span className="truncate block max-w-40" title={user?.name ?? ''}>
          {user?.name ?? '—'}
        </span>
      );
    },
  },
  {
    id: 'location',
    header: 'Location',
    cell: ({ row }) => {
      const loc = row.original.location;
      return (
        <span className="truncate block max-w-32" title={loc?.name ?? ''}>
          {loc?.name ?? '—'}
        </span>
      );
    },
  },
  {
    accessorKey: 'endsAt',
    header: 'Ends',
    cell: ({ row }) => {
      const endsAt = row.original.endsAt;
      return endsAt ? moment(endsAt).format('DD/MM/YYYY HH:mm') : '—';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status as number;
      const label = statusLabel[status] ?? String(status);
      const variant =
        status === SHIFT_STATUS.ACTIVE
          ? 'default'
          : status === SHIFT_STATUS.PAUSED
            ? 'secondary'
            : 'outline';
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    id: 'endedAt',
    header: 'Ended at',
    cell: ({ row }) => {
      const endedAt = row.original.endedAt;
      return endedAt ? moment(endedAt).format('DD/MM/YYYY HH:mm') : '—';
    },
  },
];
