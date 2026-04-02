'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { AgentHistoryCreditLimitUpdateReportRow } from '@/types/reports/agent-history-credit-limit-update';
import { formatLKR } from '@/lib/format-money';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const AgentHistoryCreditLimitUpdateColumns: ColumnDef<AgentHistoryCreditLimitUpdateReportRow>[] = [
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
  {
    accessorKey: 'changedByUserName',
    header: 'Changed by',
    cell: ({ row }) => row.getValue<string>('changedByUserName') ?? '-',
  },
  {
    accessorKey: 'limitType',
    header: 'Limit type',
    cell: ({ row }) => {
      const t = row.getValue<'soft' | 'hard'>('limitType');
      return t === 'soft' ? 'Soft' : 'Hard';
    },
  },
  {
    accessorKey: 'agencyName',
    header: 'Agent',
    cell: ({ row }) => row.getValue<string>('agencyName') ?? '-',
  },
  {
    accessorKey: 'agencyCode',
    header: 'Agent code',
    cell: ({ row }) => row.getValue<string>('agencyCode') ?? '-',
  },
  {
    accessorKey: 'oldValue',
    header: 'Old',
    cell: ({ row }) => {
      const v = row.getValue<number | null>('oldValue');
      return <span className="text-right tabular-nums block">{v == null ? '-' : formatLKR(v)}</span>;
    },
  },
  {
    accessorKey: 'newValue',
    header: 'New',
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
    id: 'more',
    header: '',
    cell: ({ row }) => {
      const r = row.original;
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              More
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Activity details</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">Date & time</div>
                  <div className="font-medium">{moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Changed by</div>
                  <div className="font-medium">{r.changedByUserName ?? r.changedByUserId ?? '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Action</div>
                  <div className="font-mono text-xs break-all">{r.action}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Entity</div>
                  <div className="font-mono text-xs break-all">
                    {(r.entityType ?? '-') + (r.entityId ? ` / ${r.entityId}` : '')}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Agent</div>
                  <div className="font-medium">
                    {r.agencyName ?? '-'}{r.agencyCode ? ` (${r.agencyCode})` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Limit type</div>
                  <div className="font-medium">{r.limitType === 'soft' ? 'Soft' : 'Hard'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Old</div>
                  <div className="font-medium">{r.oldValue == null ? '-' : formatLKR(r.oldValue)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">New</div>
                  <div className="font-medium">{r.newValue == null ? '-' : formatLKR(r.newValue)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Delta</div>
                  <div className="font-medium">{r.delta == null ? '-' : formatLKR(r.delta)}</div>
                </div>
              </div>

              <div>
                <div className="text-muted-foreground text-xs mb-1">Metadata</div>
                <pre className="max-h-[320px] overflow-auto rounded-md bg-muted p-3 text-xs leading-snug">
                  {JSON.stringify(r.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    },
  },
];

