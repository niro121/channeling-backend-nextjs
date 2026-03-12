'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { SHIFT_STATUS } from '@/types/shift';
import moment from 'moment';
import { AlertTriangle } from 'lucide-react';

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
  handovers?: Array<{ id: string; discrepancyReason: string | null }>;
};

const statusLabel: Record<number, string> = {
  [SHIFT_STATUS.PAUSED]: 'Paused',
  [SHIFT_STATUS.ACTIVE]: 'Active',
  [SHIFT_STATUS.HANDOVER_PENDING]: 'Handover pending',
  [SHIFT_STATUS.ENDED]: 'Ended',
};

export const ShiftColumns: ColumnDef<ShiftListRow>[] = [
  {
    accessorKey: 'startedAt',
    header: 'Started',
    cell: ({ row }) => {
      const id = row.original.id;
      const startedAt = row.original.startedAt;
      const handovers = row.original.handovers ?? [];
      const hasHandover = handovers.length > 0;
      const hasShortReason = handovers.some((h) => h.discrepancyReason);
      const content = startedAt
        ? moment(startedAt).format('DD/MM/YYYY HH:mm')
        : '—';
      return (
        <div className="flex items-center gap-2">
          {hasShortReason && (
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-destructive"

            />
          )}
          <Link
            href={`/shifts/${id}`}
            className="text-primary hover:underline underline-offset-2 cursor-pointer"
            title="View shift details"
          >
            {content}
          </Link>
        </div>
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
      const handovers = row.original.handovers ?? [];
      const hasHandover = handovers.length > 0;
      const label = statusLabel[status] ?? String(status);
      const variant =
        status === SHIFT_STATUS.ACTIVE
          ? 'default'
          : status === SHIFT_STATUS.PAUSED
            ? 'secondary'
            : status === SHIFT_STATUS.HANDOVER_PENDING
              ? 'secondary'
              : 'outline';
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={variant}>{label}</Badge>
          {hasHandover && (
            <Badge variant="outline" className="text-muted-foreground font-normal">
              Handed over
            </Badge>
          )}
        </div>
      );
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
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const date = (row.original as { updatedAt?: Date }).updatedAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const name = (row.original as { createdByUser?: { name?: string | null } }).createdByUser?.name ?? '—';
      const date = row.original.createdAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
];
