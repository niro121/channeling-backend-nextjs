'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Account } from '@/types/accounting';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

type AccountWithBalance = Account & { balance?: number };

export const AccountingColumns: ColumnDef<AccountWithBalance>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => {
      const code = row.getValue('code') as string | null;
      return code || <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string;
      return <span className="capitalize">{type.toLowerCase()}</span>;
    },
  },
  {
    id: 'entity',
    header: 'Location / Doctor / Agency',
    cell: ({ row }) => {
      const acc = row.original;
      if (acc.location) return <span>{acc.location.name}</span>;
      if (acc.doctor) return <span>{acc.doctor.name} ({acc.doctor.code})</span>;
      if (acc.agency) return <span>{acc.agency.name} ({acc.agency.code ?? '-'})</span>;
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    id: 'minBalanceAllowed',
    header: 'Min balance',
    cell: ({ row }) => {
      const v = row.original.minBalanceAllowed;
      if (v === null || v === undefined) return <span className="text-muted-foreground">-</span>;
      return <span>{(v / 100).toFixed(2)}</span>;
    },
  },
  {
    id: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const balance = (row.original as AccountWithBalance).balance;
      const num = typeof balance === 'number' ? balance : 0;
      return <span>{(num / 100).toFixed(2)}</span>;
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <Link href={`/accounting/accounts/${row.original.id}/statement`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <FileText className="h-4 w-4" />
            Statement
          </Button>
        </Link>
      </div>
    ),
  },
];
