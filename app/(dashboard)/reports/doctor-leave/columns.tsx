'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import {DoctorLeaveReportRow} from '@/types/reports/doctor.leave'

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
    header: 'Leave Date',
    cell: ({ row }) => {
      const date = row.getValue<Date>('fromDate');
      return date ? moment(date).format('DD/MM/YYYY') : '-';
    }
  },
  {
    id: 'leaveSessions',
    header: 'Leave Sessions',
    cell: ({ row }) => {
      const formatted = row.original.leaveSessionsFormatted;
      if (!formatted) return '-';
      return (
        <div className="max-w-64 text-xs whitespace-nowrap" title={formatted}>
          {formatted}
        </div>
      );
    }
  },
  {
    accessorKey: 'remarks',
    header: 'Leave Remark',
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
    id: 'leaveUpdator',
    header: 'Leave Updater',
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
        }
  },
  {
    id: 'leaveCreator',
    header: 'Leave Creator',
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
  }
];
