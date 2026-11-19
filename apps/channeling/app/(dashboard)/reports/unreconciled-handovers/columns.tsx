'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatCents } from '@/lib/format-money';
import type { UnreconciledHandoversReportRow } from '@/types/reports/unreconciled-handovers';

function money(cents: number | null) {
  if (cents == null) return <span className="block text-right text-muted-foreground">—</span>;
  return <span className="block text-right tabular-nums">{formatCents(cents)}</span>;
}

export const UnreconciledHandoversColumns: ColumnDef<UnreconciledHandoversReportRow>[] = [
  {
    id: 'line',
    header: 'Line',
    cell: ({ row }) => {
      const item = row.original;
      if (item.rowKind === 'balance') return 'Till';
      if (item.rowKind === 'subtotal') return <span className="font-semibold">Handover total</span>;
      return (
        <div>
          <div>{item.receiptNo || '—'}</div>
          {item.sourceHandoverNo ? (
            <div className="text-xs text-muted-foreground">Included {item.sourceHandoverNo}</div>
          ) : null}
        </div>
      );
    },
  },
  {
    id: 'method',
    header: 'Method',
    cell: ({ row }) =>
      row.original.rowKind === 'subtotal' ? '—' : row.original.methodLabel || '—',
  },
  {
    id: 'bank',
    header: 'Bank',
    cell: ({ row }) => (row.original.rowKind === 'item' ? row.original.bank || '—' : '—'),
  },
  {
    id: 'reference',
    header: 'Reference',
    cell: ({ row }) => (row.original.rowKind === 'item' ? row.original.reference || '—' : '—'),
  },
  {
    id: 'notDeducted',
    header: () => <span className="block text-right">Not deducted</span>,
    cell: ({ row }) => {
      const item = row.original;
      if (item.rowKind === 'balance') return money(item.undeductedCents);
      return money(item.amountCents);
    },
  },
  {
    id: 'tillBalance',
    header: () => <span className="block text-right">Till balance</span>,
    cell: ({ row }) => money(row.original.tillCents),
  },
  {
    id: 'difference',
    header: () => <span className="block text-right">Difference</span>,
    cell: ({ row }) => money(row.original.differenceCents),
  },
  {
    id: 'why',
    header: 'Why it is still on the till',
    cell: ({ row }) => {
      const item = row.original;
      if (item.rowKind === 'balance') return item.note || '—';
      if (item.rowKind === 'subtotal') return item.why || '—';
      return item.why || '—';
    },
  },
];
