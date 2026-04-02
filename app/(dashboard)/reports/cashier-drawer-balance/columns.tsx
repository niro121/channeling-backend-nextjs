'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { CashierDrawerBalanceReportRow } from '@/types/reports/cashier-drawer-balance';
import { formatCents } from '@/lib/format-money';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';

function fmtTill(name: string | null, code: string | null): string {
  const n = (name ?? '').trim() || '-';
  return code ? `${n} (${code})` : n;
}

export const CashierDrawerBalanceReportColumns: ColumnDef<CashierDrawerBalanceReportRow>[] = [
  {
    accessorKey: 'tillAccountName',
    header: 'Till',
    cell: ({ row }) => {
      const r = row.original;
      return fmtTill(r.tillAccountName, r.tillAccountCode);
    }
  },
  {
    accessorKey: 'cashierName',
    header: 'Cashier',
    cell: ({ row }) => {
      const r = row.original;
      return formatUserDisplayName(r.cashierName, r.cashierUserId ?? undefined, r.cashierStaffCode);
    }
  },
  {
    accessorKey: 'cashCents',
    header: () => <span className="text-right block">Cash</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatCents(row.getValue<number>('cashCents') ?? 0)}</span>
  },
  {
    accessorKey: 'cardCents',
    header: () => <span className="text-right block">Card</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatCents(row.getValue<number>('cardCents') ?? 0)}</span>
  },
  {
    accessorKey: 'creditCents',
    header: () => <span className="text-right block">Credit</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatCents(row.getValue<number>('creditCents') ?? 0)}</span>
  },
  {
    accessorKey: 'slipCents',
    header: () => <span className="text-right block">Slip</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatCents(row.getValue<number>('slipCents') ?? 0)}</span>
  },
  {
    accessorKey: 'checkCents',
    header: () => <span className="text-right block">Check</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatCents(row.getValue<number>('checkCents') ?? 0)}</span>
  },
  {
    accessorKey: 'eWalletCents',
    header: () => <span className="text-right block">E-Wallet</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatCents(row.getValue<number>('eWalletCents') ?? 0)}</span>
  },
  {
    accessorKey: 'totalCents',
    header: () => <span className="text-right block">Total</span>,
    cell: ({ row }) => <span className="text-right tabular-nums font-semibold block">{formatCents(row.getValue<number>('totalCents') ?? 0)}</span>
  }
];

