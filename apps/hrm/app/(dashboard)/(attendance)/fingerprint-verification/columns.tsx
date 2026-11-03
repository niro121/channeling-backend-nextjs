'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Eraser } from 'lucide-react';
import { Badge, Button, Input } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { FingerprintVerificationRow } from '@/types/attendance';

const STATUS_STYLES: Record<string, string> = {
  ok: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  missing: 'bg-red-100 text-red-700 hover:bg-red-100',
  late: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  early_out: 'bg-amber-100 text-amber-800 hover:bg-amber-100'
};

export type FingerprintColumnHandlers = {
  canEdit: boolean;
  onVerifiedChange: (
    rowKey: string,
    field: 'verifiedStart' | 'verifiedEnd',
    value: string
  ) => void;
  onClearRow: (rowKey: string) => void;
};

export function createFingerprintVerificationColumns(
  handlers: FingerprintColumnHandlers
): ColumnDef<FingerprintVerificationRow>[] {
  return [
    {
      accessorKey: 'no',
      header: () => <span className="whitespace-nowrap">NO</span>,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{row.original.no}</span>
      ),
      size: 48
    },
    {
      accessorKey: 'shiftLabel',
      header: 'SHIFT',
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium">{row.original.shiftLabel}</span>
      )
    },
    {
      accessorKey: 'durationMinutes',
      header: () => <span className="whitespace-nowrap">DURATION</span>,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.durationMinutes || '—'}</span>
      )
    },
    {
      accessorKey: 'staffCode',
      header: () => <span className="whitespace-nowrap">STAFF CODE</span>,
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{row.original.staffCode}</span>
      )
    },
    {
      accessorKey: 'staffLegacyId',
      header: 'ID',
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.staffLegacyId || '—'}
        </span>
      )
    },
    {
      accessorKey: 'leaveReplace',
      header: () => <span className="whitespace-nowrap">LEAVE / REPLACE</span>,
      cell: ({ row }) => <span>{row.original.leaveReplace}</span>
    },
    {
      accessorKey: 'staffName',
      header: () => <span className="whitespace-nowrap">STAFF NAME</span>,
      cell: ({ row }) => <span>{row.original.staffName}</span>
    },
    {
      accessorKey: 'attStart',
      header: () => <span className="whitespace-nowrap">ATT. START</span>,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.attStart || '—'}</span>
      )
    },
    {
      accessorKey: 'exceptionCode',
      header: () => <span className="sr-only">Exception</span>,
      cell: ({ row }) => (
        <span className="font-semibold text-orange-600">
          {row.original.exceptionCode || ''}
        </span>
      ),
      size: 32
    },
    {
      accessorKey: 'attEnd',
      header: () => <span className="whitespace-nowrap">ATT. END</span>,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.attEnd || '—'}</span>
      )
    },
    {
      accessorKey: 'verifiedStart',
      header: () => <span className="whitespace-nowrap">VERIFIED START</span>,
      cell: ({ row }) => (
        <Input
          className="h-8 w-[7.5rem] tabular-nums"
          value={row.original.verifiedStart}
          disabled={!handlers.canEdit}
          placeholder="hh:mm a"
          onChange={(e) =>
            handlers.onVerifiedChange(
              row.original.rowKey,
              'verifiedStart',
              e.target.value
            )
          }
        />
      )
    },
    {
      accessorKey: 'verifiedEnd',
      header: () => <span className="whitespace-nowrap">VERIFIED END</span>,
      cell: ({ row }) => (
        <Input
          className="h-8 w-[7.5rem] tabular-nums"
          value={row.original.verifiedEnd}
          disabled={!handlers.canEdit}
          placeholder="hh:mm a"
          onChange={(e) =>
            handlers.onVerifiedChange(
              row.original.rowKey,
              'verifiedEnd',
              e.target.value
            )
          }
        />
      )
    },
    {
      accessorKey: 'statusLabel',
      header: 'STATUS',
      cell: ({ row }) => (
        <Badge
          className={cn(
            'font-medium',
            STATUS_STYLES[row.original.status] ??
              'bg-slate-100 text-slate-700 hover:bg-slate-100'
          )}
        >
          {row.original.statusLabel}
        </Badge>
      )
    },
    {
      id: 'clear',
      header: 'CLEAR',
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          disabled={!handlers.canEdit}
          title="Clear verified times"
          onClick={() => handlers.onClearRow(row.original.rowKey)}
        >
          <Eraser className="h-4 w-4" />
          <span className="sr-only">Clear</span>
        </Button>
      )
    },
    {
      accessorKey: 'dateLabel',
      header: 'Date',
      cell: ({ row }) => row.original.dateLabel
    }
  ];
}
