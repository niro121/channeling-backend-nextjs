'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import { ApiLogReportRow } from '@/types/reports/api.log';

export const ApiLogReportColumns: ColumnDef<ApiLogReportRow>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => {
      const id = row.getValue<string>('id');
      // Show short version of ObjectId for display
      return (
        <div className="max-w-20 truncate font-mono text-xs" title={id}>
          {id ? id.slice(-6) : '-'}
        </div>
      );
    }
  },
  {
    accessorKey: 'createdAt',
    header: () => <span className="whitespace-nowrap">Date / Time</span>,
    cell: ({ row }) => {
      const date = row.getValue<Date>('createdAt');
      return date ? moment(date).format('DD/MM/YYYY hh:mm A') : '-';
    }
  },
  {
    accessorKey: 'duration',
    header: () => <span className="whitespace-nowrap">Duration(S)</span>,
    cell: ({ row }) => {
      const duration = row.getValue<number | null | undefined>('duration');
      return duration != null ? `${duration}s` : '-';
    }
  },
  {
    accessorKey: 'endpoint',
    header: 'API',
    cell: ({ row }) => {
      const endpoint = row.getValue<string>('endpoint');
      return (
        <div className="max-w-48 truncate" title={endpoint}>
          {endpoint ?? '-'}
        </div>
      );
    }
  },
  {
    accessorKey: 'uuid',
    header: 'UUID',
    cell: ({ row }) => {
      const uuid = row.getValue<string | null | undefined>('uuid');
      return (
        <div className="max-w-32 truncate font-mono text-xs" title={uuid ?? ''}>
          {uuid ?? '-'}
        </div>
      );
    }
  },
  {
    accessorKey: 'errorStatus',
    header: () => <span className="whitespace-nowrap">Error Status</span>,
    cell: ({ row }) => {
      const errorStatus = row.getValue<boolean | string | null | undefined>('errorStatus');
      const isError = errorStatus === true || errorStatus === 'error' || errorStatus === 'Error' || errorStatus === 'ERROR';
      return (
        <Badge
          variant={isError ? 'destructive' : 'default'}
          className={
            isError
              ? 'gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 border-0'
              : 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
          }
        >
          {isError ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {isError ? 'Error' : 'Success'}
        </Badge>
      );
    }
  },
  {
    id: 'body',
    header: 'Body',
    cell: ({ row }) => {
      const requestBody = row.original.requestBody;
      const responseBody = row.original.responseBody;
      const body = requestBody || responseBody || '-';
      return (
        <div className="max-w-64 truncate text-xs" title={body}>
          {body}
        </div>
      );
    }
  }
];
