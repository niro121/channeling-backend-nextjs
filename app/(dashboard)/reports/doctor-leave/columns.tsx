'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';

export type DoctorLeaveReportRow = {
  id: string;
  fromDate: Date;
  toDate: Date;
  status: number;
  remarks: string | null;
  doctor: { id: string; name: string; code: string };
  sessions?: unknown[];
  createdUser?: { id: string; name: string } | null;
  updatedUser?: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

export const DoctorLeaveReportColumns: ColumnDef<DoctorLeaveReportRow>[] = [
  {
    accessorKey: 'doctor.code',
    header: () => <span className="whitespace-nowrap">Doctor Code</span>,
    cell: ({ row }) => {
      const code = row.original.doctor?.code;
      return (
        <div className="max-w-28 truncate" title={code}>
          {code ?? '-'}
        </div>
      );
    }
  },
  {
    accessorKey: 'doctor.name',
    header: () => <span className="whitespace-nowrap">Doctor Name</span>,
    cell: ({ row }) => row.original.doctor?.name ?? '-'
  },
  {
    accessorKey: 'fromDate',
    header: 'From Date',
    cell: ({ row }) => {
      const date = row.getValue<Date>('fromDate');
      return date ? moment(date).format('DD/MM/YYYY') : '-';
    }
  },
  {
    accessorKey: 'toDate',
    header: 'To Date',
    cell: ({ row }) => {
      const date = row.getValue<Date>('toDate');
      return date ? moment(date).format('DD/MM/YYYY') : '-';
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue<number>('status');
      const isActive = status === 1;
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
          }
        >
          {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isActive ? 'Active' : 'Cancel'}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => {
      const remarks = row.getValue<string>('remarks');
      return (
        <div className="max-w-32 truncate" title={remarks ?? ''}>
          {remarks ?? '-'}
        </div>
      );
    }
  },
  {
    id: 'sessionCount',
    header: 'Sessions',
    cell: ({ row }) => {
      const sessions = row.original.sessions;
      const count = Array.isArray(sessions) ? sessions.length : 0;
      return <span>{count}</span>;
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const name = row.original.createdUser?.name ?? '—';
      const date = row.original.createdAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const name = row.original.updatedUser?.name ?? '—';
      const date = row.original.updatedAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    }
  }
];
