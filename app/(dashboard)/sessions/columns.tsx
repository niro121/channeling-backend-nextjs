'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
import { formatTimeSriLanka, normalizeSessionTime } from '@/lib/utils';
import { SessionRecordActions } from './record-actions';
import { SessionViewDialog } from './session-view-dialog';

function SessionIdCell({ row }: { row: { original: SessionListItem } }) {
  const [viewOpen, setViewOpen] = useState(false);
  const session = row.original;
  const id = session.id;
  return (
    <>
      <button
        type="button"
        onClick={() => setViewOpen(true)}
        className="font-mono text-xs text-primary hover:underline max-w-[8rem] truncate block text-left cursor-pointer"
        title={`View session ${id}`}
      >
        {id}
      </button>
      <SessionViewDialog session={session} open={viewOpen} onOpenChange={setViewOpen} />
    </>
  );
}

/** Format session time for display in Sri Lanka (DB stores UTC). */
function formatSessionTime(value: Date | number | string, date?: Date): string {
  const sessionDate = date instanceof Date ? date : date ? new Date(date) : new Date();
  const normalized =
    typeof value === 'string' ? new Date(value) : normalizeSessionTime(value as Date | number, sessionDate);
  return formatTimeSriLanka(normalized);
}

export type SessionListItem = {
  id: string;
  date: Date;
  startTime: number;
  endTime: number;
  durationMinutes?: number | null;
  maxPatientNumber?: number;
  originalSessionName?: string;
  location?: { name: string | null } | null;
  doctor?: { name?: string | null } | null;
  department?: { name?: string | null } | null;
  room?: { number?: string | null } | null;
  amountLocal?: number | null;
  amountForeign?: number | null;
  appointmentNo?: number;
  startingPatientNumber?: number;
  refundable?: number;
  remarks?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdUser?: { name: string | null } | null;
  updatedUser?: { name: string | null } | null;
  status: number;
  [key: string]: unknown;
};

export const SessionColumns: ColumnDef<SessionListItem>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => <SessionIdCell row={row} />,
    enableSorting: false
  },
  {
    id: 'date',
    header: 'Date',
    cell: ({ row }) => {
      const { date, originalSessionName } = row.original;
      const dateStr = moment(date).format('DD MMM YYYY');
      const original = originalSessionName ? `(${originalSessionName})` : null;
      return (
        <div className="flex flex-col gap-0.5 text-xs whitespace-nowrap">
          <span>{dateStr}</span>
          {original && <span className="text-muted-foreground/80">{original}</span>}
        </div>
      );
    },
    enableSorting: false
  },
  {
    id: 'time',
    header: 'Time',
    cell: ({ row }) => {
      const { date, startTime, endTime } = row.original;
      const timeStr = `${formatSessionTime(startTime, date)} – ${formatSessionTime(endTime, date)}`;
      return <span className="text-xs whitespace-nowrap">{timeStr}</span>;
    },
    enableSorting: false
  },
  {
    id: 'branch',
    header: 'Branch',
    cell: ({ row }) => row.original.location?.name ?? '—',
    enableSorting: false
  },
  {
    id: 'fees',
    header: 'Fee',
    cell: ({ row }) => {
      const local = row.original.amountLocal != null ? String(row.original.amountLocal) : '—';
      const foreign = row.original.amountForeign != null ? String(row.original.amountForeign) : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>Local: {local}</span>
          <span className="text-muted-foreground">Foreign: {foreign}</span>
        </div>
      );
    },
    enableSorting: false
  },
  {
    accessorKey: 'appointmentNo',
    header: 'Appt',
    cell: ({ row }) => row.original.appointmentNo ?? 0,
    enableSorting: false
  },
  {
    id: 'createdUpdated',
    header: 'Created / Updated',
    cell: ({ row }) => {
      const createdName = row.original.createdUser?.name ?? '—';
      const createdDate = row.original.createdAt
        ? moment(row.original.createdAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      const updatedName = row.original.updatedUser?.name ?? '—';
      const updatedDate = row.original.updatedAt
        ? moment(row.original.updatedAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      return (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-muted-foreground">Created</span>
            <span>{createdName}</span>
            <span className="text-muted-foreground">{createdDate}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-muted-foreground">Updated</span>
            <span>{updatedName}</span>
            <span className="text-muted-foreground">{updatedDate}</span>
          </div>
        </div>
      );
    },
    enableSorting: false
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      const isActive = status === 1;
      return (
        <Badge variant={isActive ? 'default' : 'secondary'} className={!isActive ? 'bg-amber-100 text-amber-800' : ''}>
          {isActive ? 'Active' : 'Leave'}
        </Badge>
      );
    },
    enableSorting: false
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <SessionRecordActions row={row} />,
    enableSorting: false
  }
];
