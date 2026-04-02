'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import type { ChannelTransferReportRow } from '@/types/reports/channel-transfer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function dt(d: Date | null): string {
  return d ? moment(d).format('YYYY-MM-DD HH:mm') : '-';
}

export const ChannelTransferReportColumns: ColumnDef<ChannelTransferReportRow>[] = [
  {
    accessorKey: 'transferredAt',
    header: 'Transferred Date',
    cell: ({ row }) => dt(row.getValue<Date>('transferredAt') ?? null),
  },
  {
    accessorKey: 'transferredByUserName',
    header: 'Transferred by Name & Code',
    cell: ({ row }) => row.getValue<string>('transferredByUserName') ?? '-',
  },
  {
    accessorKey: 'beforeActivity',
    header: 'From (Before)',
    cell: ({ row }) => {
      const v = row.getValue<string | null>('beforeActivity');
      return <div className="max-w-[520px] whitespace-normal break-words">{v ?? '-'}</div>;
    },
  },
  {
    accessorKey: 'afterActivity',
    header: 'To (After)',
    cell: ({ row }) => {
      const v = row.getValue<string | null>('afterActivity');
      return <div className="max-w-[520px] whitespace-normal break-words">{v ?? '-'}</div>;
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
              <DialogTitle>Transfer details</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">Booking ID</div>
                  <div className="font-mono text-xs break-all">{r.bookingId}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Remarks</div>
                  <div className="font-medium">{r.remarks ?? '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground text-xs">From (Before)</div>
                  <div className="whitespace-pre-wrap break-words">{r.beforeActivity ?? '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">To (After)</div>
                  <div className="whitespace-pre-wrap break-words">{r.afterActivity ?? '-'}</div>
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Activity metadata</div>
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

