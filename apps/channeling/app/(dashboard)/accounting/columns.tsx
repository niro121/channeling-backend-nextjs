'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Account } from '@/types/accounting';
import Link from 'next/link';
import moment from 'moment';
import { formatCents } from '@/lib/format-money';
import { AccountRecordActions } from './account-record-actions';

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
    cell: ({ row }) => {
      const id = row.original.id;
      const name = row.getValue('name') as string;
      if (!id) return name;
      return (
        <Link
          href={`/accounting/${id}/edit`}
          className="font-medium text-primary hover:underline"
        >
          {name}
        </Link>
      );
    },
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
    header: 'Location / Doctor / Agency / Credit Customer',
    cell: ({ row }) => {
      const acc = row.original;
      if (acc.location) return <span>{acc.location.name}</span>;
      if (acc.doctor) return <span>{acc.doctor.name} ({acc.doctor.code})</span>;
      if (acc.agency) return <span>{acc.agency.name} ({acc.agency.code ?? '-'})</span>;
      if (acc.creditCustomer) return <span>{acc.creditCustomer.name} ({acc.creditCustomer.code ?? '-'})</span>;
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    id: 'linkedUser',
    header: 'Linked user',
    cell: ({ row }) => {
      const acc = row.original;
      if (!acc.userId) return <span className="text-muted-foreground">-</span>;
      if (!acc.user) return <span className="text-muted-foreground">{acc.userId}</span>;
      return (
        <div className="flex flex-col">
          <span>
            {acc.user.name}
            {acc.user.staffCode ? (
              <span className="ml-1 text-muted-foreground">({acc.user.staffCode})</span>
            ) : null}
          </span>
          <span className="text-xs text-muted-foreground">{acc.user.email}</span>
        </div>
      );
    },
  },
  {
    id: 'minBalanceAllowed',
    header: 'Min balance',
    cell: ({ row }) => {
      const v = row.original.minBalanceAllowed;
      if (v === null || v === undefined) return <span className="text-muted-foreground">-</span>;
      return <span className="tabular-nums">{formatCents(v)}</span>;
    },
  },
  {
    id: 'maxBalanceAllowed',
    header: 'Max balance',
    cell: ({ row }) => {
      const v = row.original.maxBalanceAllowed;
      if (v === null || v === undefined) return <span className="text-muted-foreground">-</span>;
      return <span className="tabular-nums">{formatCents(v)}</span>;
    },
  },
  {
    id: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const balance = (row.original as AccountWithBalance).balance;
      const num = typeof balance === 'number' ? balance : 0;
      return <span className="tabular-nums">{formatCents(num)}</span>;
    },
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const date = row.original.updatedAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const date = row.original.createdAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <AccountRecordActions row={row} />
      </div>
    ),
  },
];
