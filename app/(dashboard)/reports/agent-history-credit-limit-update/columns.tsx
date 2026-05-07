'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { AgentHistoryCreditLimitUpdateReportRow } from '@/types/reports/agent-history-credit-limit-update';
import { formatLKR } from '@/lib/format-money';

export const AgentHistoryCreditLimitUpdateColumns: ColumnDef<AgentHistoryCreditLimitUpdateReportRow>[] = [
  {
    id: 'no',
    header: 'No.',
    cell: ({ row }) => <span className="tabular-nums">{row.index + 1}</span>,
  },
  {
    accessorKey: 'agencyName',
    header: 'Agent',
    cell: ({ row }) => row.getValue<string>('agencyName') ?? '-',
  },
  {
    accessorKey: 'agencyCode',
    header: 'Agent Code',
    cell: ({ row }) => row.getValue<string>('agencyCode') ?? '-',
  },
  {
    accessorKey: 'limitType',
    header: 'Limit Type',
    cell: ({ row }) => {
      const t = row.getValue<'soft' | 'hard'>('limitType');
      return t === 'soft' ? 'Soft' : 'Hard';
    },
  },
  {
    accessorKey: 'hardLimitField',
    header: 'Hard Limit Field',
    cell: ({ row }) => {
      const limitType = row.getValue<'soft' | 'hard'>('limitType');
      const field = row.getValue<'minBalanceAllowed' | 'maxBalanceAllowed' | null>('hardLimitField');
      if (limitType !== 'hard') return '-';
      if (field === 'minBalanceAllowed') return 'Minimum balance';
      if (field === 'maxBalanceAllowed') return 'Maximum balance';
      return 'Hard limit';
    },
  },
  {
    accessorKey: 'oldValue',
    header: 'Before Value',
    cell: ({ row }) => {
      const v = row.getValue<number | null>('oldValue');
      return <span className="text-right tabular-nums block">{v == null ? '-' : formatLKR(v)}</span>;
    },
  },
  {
    accessorKey: 'newValue',
    header: 'Updated Value',
    cell: ({ row }) => {
      const v = row.getValue<number | null>('newValue');
      return <span className="text-right tabular-nums block">{v == null ? '-' : formatLKR(v)}</span>;
    },
  },
  {
    accessorKey: 'delta',
    header: 'Delta',
    cell: ({ row }) => {
      const v = row.getValue<number | null>('delta');
      if (v == null) return '-';
      const cls = v > 0 ? 'text-emerald-700' : v < 0 ? 'text-red-700' : '';
      return <span className={`text-right tabular-nums block ${cls}`.trim()}>{formatLKR(v)}</span>;
    },
  },
  {
    accessorKey: 'changedByUserName',
    header: 'Changed by',
    cell: ({ row }) => row.getValue<string>('changedByUserName') ?? '-',
  },
  {
    accessorKey: 'createdAt',
    header: 'Date & Time',
    cell: ({ row }) => {
      const date = row.getValue<Date>('createdAt');
      if (!date) return '-';
      return (
        <div className="flex flex-col min-w-[140px]">
          <span>{moment(date).format('YYYY-MM-DD')}</span>
          <span className="text-muted-foreground text-xs">{moment(date).format('HH:mm:ss')}</span>
        </div>
      );
    },
  },
];

