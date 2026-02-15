'use client';

import React, { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';
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

/** startTime/endTime from DB may be unix seconds (from helper) or minutes from midnight (from service). */
function formatSessionTime(value: number, date?: Date): string {
  const d = date ? moment(date) : moment();
  if (value > 86400 * 2) {
    return moment.unix(value).format('LT');
  }
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return moment().startOf('day').add(hours, 'hours').add(mins, 'minutes').format('LT');
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
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => moment(row.original.date).format('YYYY-MM-DD'),
    enableSorting: false
  },
  {
    id: 'time',
    header: 'Time',
    cell: ({ row }) => {
      const { startTime, endTime, date } = row.original;
      return `${formatSessionTime(startTime, date)} – ${formatSessionTime(endTime, date)}`;
    },
    enableSorting: false
  },
  {
    accessorKey: 'originalSessionName',
    header: 'Original Session',
    cell: ({ row }) => row.original.originalSessionName ?? '—',
    enableSorting: false
  },
  {
    id: 'branch',
    header: 'Branch',
    cell: ({ row }) => row.original.location?.name ?? '—',
    enableSorting: false
  },
  {
    accessorKey: 'amountLocal',
    header: 'Local Fee',
    cell: ({ row }) => (row.original.amountLocal != null ? String(row.original.amountLocal) : '—'),
    enableSorting: false
  },
  {
    accessorKey: 'amountForeign',
    header: 'Foreign Fee',
    cell: ({ row }) => (row.original.amountForeign != null ? String(row.original.amountForeign) : '—'),
    enableSorting: false
  },
  {
    accessorKey: 'appointmentNo',
    header: 'Appt',
    cell: ({ row }) => row.original.appointmentNo ?? 0,
    enableSorting: false
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const name = row.original.createdUser?.name ?? '—';
      const date = row.original.createdAt
        ? moment(row.original.createdAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{date}</span>
        </div>
      );
    },
    enableSorting: false
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const name = row.original.updatedUser?.name ?? '—';
      const date = row.original.updatedAt
        ? moment(row.original.updatedAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{date}</span>
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
