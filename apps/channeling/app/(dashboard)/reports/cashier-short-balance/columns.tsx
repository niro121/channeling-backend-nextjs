'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { CashierShortBalanceReportRow } from '@/types/reports/cashier-short-balance';
import { formatCents } from '@/lib/format-money';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';

function fmtAccount(name: string | null, code: string | null): string {
  const n = (name ?? '').trim() || '-';
  return code ? `${n} (${code})` : n;
}

function fmtBranch(name: string | null, code: string | null): string {
  const n = (name ?? '').trim();
  if (!n && !code) return '-';
  if (n && code) return `${n} (${code})`;
  return n || code || '-';
}

function amountCell(value: number, emphasize = false) {
  return (
    <span className={`text-right tabular-nums block${emphasize ? ' font-semibold' : ''}`}>
      {formatCents(value)}
    </span>
  );
}

export const CashierShortBalanceReportColumns: ColumnDef<CashierShortBalanceReportRow>[] = [
  {
    accessorKey: 'accountName',
    header: 'Account',
    cell: ({ row }) => fmtAccount(row.original.accountName, row.original.accountCode)
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
    accessorKey: 'locationName',
    header: 'Branch',
    cell: ({ row }) => fmtBranch(row.original.locationName, row.original.locationCode)
  },
  {
    accessorKey: 'cashCents',
    header: () => <span className="text-right block">Cash</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('cashCents') ?? 0)
  },
  {
    accessorKey: 'cardCents',
    header: () => <span className="text-right block">Card</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('cardCents') ?? 0)
  },
  {
    accessorKey: 'creditCents',
    header: () => <span className="text-right block">Credit</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('creditCents') ?? 0)
  },
  {
    accessorKey: 'slipCents',
    header: () => <span className="text-right block">Slip</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('slipCents') ?? 0)
  },
  {
    accessorKey: 'checkCents',
    header: () => <span className="text-right block">Cheque</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('checkCents') ?? 0)
  },
  {
    accessorKey: 'eWalletCents',
    header: () => <span className="text-right block">E-Wallet</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('eWalletCents') ?? 0)
  },
  {
    accessorKey: 'totalCents',
    header: () => <span className="text-right block">Total</span>,
    cell: ({ row }) => amountCell(row.getValue<number>('totalCents') ?? 0, true)
  }
];
