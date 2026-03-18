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
    accessorKey: 'leaveDate',
    header: 'Leave Date',
    cell: ({ row }) => {
      const date = row.getValue<Date>('leaveDate');
      return date ? moment(date).format('DD/MM/YYYY') : '-';
    }
  },
  {
    id: 'leaveSessions',
    header: 'Leave Session',
    cell: ({ row }) => {
      const formatted = row.original.leaveSessionFormatted;
      const leaveDate = row.original.leaveDate;
      if (!formatted && !leaveDate) return '-';
      const dateLine = leaveDate ? moment(leaveDate).format('Do MMMM YYYY') : '-';
      return (
        <div className="max-w-64 text-xs" title={`${dateLine}\n${formatted ?? '-'}`}>
          <div className="truncate font-medium">{dateLine}</div>
          <div className="truncate text-muted-foreground">{formatted ?? '-'}</div>
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
        <div className="w-32 max-w-48" title={remarks ?? ''}>
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
          const staffCode = row.original.updatedUser?.staff?.code;
          const displayName = staffCode ? `${name} (${staffCode})` : name;
          const date = row.original.updatedAt
            ? moment(row.original.updatedAt).format('DD/MM/YYYY hh:mm A')
            : '—';
          return (
            <div className="flex flex-col gap-0.5 text-xs">
              <span>{displayName}</span>
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
          const staffCode = row.original.createdUser?.staff?.code;
          const displayName = staffCode ? `${name} (${staffCode})` : name;
          const date = row.original.createdAt
            ? moment(row.original.createdAt).format('DD/MM/YYYY hh:mm A')
            : '—';
          return (
            <div className="flex flex-col gap-0.5 text-xs">
              <span>{displayName}</span>
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
