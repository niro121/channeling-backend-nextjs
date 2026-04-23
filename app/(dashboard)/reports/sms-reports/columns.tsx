'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';
import { SmsReportRow } from '@/types/reports/sms.report';

function formatPhoneListForDisplay(raw: string): string[] {
  if (!raw) return ['-'];
  const numbers = raw.match(/[+]?\d+/g) ?? [];
  if (numbers.length === 0) return ['-'];
  const lines: string[] = [];
  for (let i = 0; i < numbers.length; i += 4) {
    lines.push(numbers.slice(i, i + 4).join(', '));
  }
  return lines;
}

export const SmsReportsColumns: ColumnDef<SmsReportRow>[] = [
  {
    accessorKey: 'createdAt',
    header: () => <span className="whitespace-nowrap">Date / time</span>,
    cell: ({ row }) => {
      const date = row.getValue<Date>('createdAt');
      return date ? moment(date).format('DD/MM/YYYY hh:mm A') : '-';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
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
          {isSent ? 'Sent' : 'Failed'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'name',
    header: () => <span className="whitespace-nowrap">Source</span>,
    cell: ({ row }) => {
      const source = row.getValue<string>('name');
      return (
        <div className="max-w-44 truncate" title={source ?? ''}>
          {source ?? '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: () => <span className="whitespace-nowrap">Phone</span>,
    cell: ({ row }) => {
      const phone = row.getValue<string>('phone');
      return (
        <div className="space-y-1 leading-5 text-xs font-mono">
          {formatPhoneListForDisplay(phone ?? '').map((line, idx) => (
            <div key={`${row.original.id}-phone-line-${idx}`} className="whitespace-nowrap">
              {line}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'template',
    header: () => <span className="whitespace-nowrap">Message</span>,
    cell: ({ row }) => {
      const template = row.getValue<string>('template');
      return (
        <div className="min-w-[280px] max-w-[520px] whitespace-pre-wrap break-words text-xs text-muted-foreground leading-5">
          {template || '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'count',
    header: () => <span className="whitespace-nowrap">Count</span>,
    cell: ({ row }) => {
      const count = row.getValue<number>('count');
      return <div className="text-right tabular-nums">{count ?? 0}</div>;
    },
  },
];
