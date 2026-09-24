'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import {SmsLogReportRow} from '@/types/reports/sms.log'

export const SmsLogReportColumns: ColumnDef<SmsLogReportRow>[] = [
  {
    accessorKey: 'name',
    header: () => <span className="whitespace-nowrap">Name</span>,
    cell: ({ row }) => {
      if (row.original.id === '__total__') {
        return <span className="font-semibold">Total Count</span>;
      }
      const name = row.getValue<string>('name');
      return (
        <div className="max-w-32 truncate" title={name ?? ''}>
          {name ?? '-'}
        </div>
      );
    }
  },
  {
    accessorKey: 'phone',
    header: () => <span className="whitespace-nowrap">Phone</span>,
    cell: ({ row }) => {
      if (row.original.id === '__total__') return '';
      const phone = row.getValue<string>('phone');
      return (
        <div className="max-w-40 truncate" title={phone ?? ''}>
          {phone ?? '-'}
        </div>
      );
    }
  },
  {
    accessorKey: 'template',
    header: () => <span className="whitespace-nowrap">Template</span>,
    cell: ({ row }) => {
      if (row.original.id === '__total__') return '';
      const template = row.getValue<string>('template');
      return (
        <div className="max-w-64 truncate" title={template ?? ''}>
          {template ?? '-'}
        </div>
      );
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ row }) => {
      if (row.original.id === '__total__') return '';
      const date = row.getValue<Date>('createdAt');
      return date ? moment(date).format('DD/MM/YYYY hh:mm A') : '-';
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      if (row.original.id === '__total__') return '';
      const status = row.getValue<number>('status');
      const isSent = status === 0;
      return (
        <Badge
          variant={isSent ? 'default' : 'destructive'}
          className={
            isSent
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border-0'
          }
        >
          {isSent ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isSent ? 'Sent' : 'Failure'}
        </Badge>
      );
    }
  },
  {
    accessorKey: 'count',
    header: 'Count',
    cell: ({ row }) => {
      const count = row.getValue<number>('count');
      return (
        <div className={row.original.id === '__total__' ? 'text-right font-semibold' : 'text-right'}>
          {count ?? 0}
        </div>
      );
    }
  }
];
