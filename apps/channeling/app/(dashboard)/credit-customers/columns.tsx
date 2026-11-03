'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CreditCustomer } from '@/types/credit-customer';
import { formatLKR } from '@/lib/format-money';
import CreditCustomerRecordActions from './record-actions';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';

export const CreditCustomerColumns: ColumnDef<CreditCustomer>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => {
      const code = row.getValue('code') as string | null | undefined;
      return code ? <span>{code}</span> : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'contactPersonName',
    header: 'Contact Person',
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string | null | undefined;
      return email ? <span>{email}</span> : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string | null | undefined;
      return phone ? <span>{phone}</span> : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const balance = row.getValue('balance') as number | undefined;
      return <span className="tabular-nums">{balance != null ? formatLKR(Number(balance)) : '0.00'}</span>;
    },
  },
  {
    id: 'account',
    header: 'Account',
    cell: ({ row }) => {
      const accountId = (row.original as CreditCustomer).accountId;
      const hasLinkedAccount = !!accountId;
      if (hasLinkedAccount) {
        return (
          <span className="inline-flex items-center gap-1 text-muted-foreground" title="GL account linked">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </span>
        );
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>No GL account linked. Create from edit page.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as number | undefined;
      const isActive = status === 1;
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={
            isActive
              ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
              : 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
          }
        >
          {isActive ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {isActive ? 'Published' : 'Unpublished'}
        </Badge>
      );
    },
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const name = (row.original as { updatedUser?: { name?: string | null } }).updatedUser?.name ?? '—';
      const date = (row.original as { updatedAt?: Date }).updatedAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const name = (row.original as { createdUser?: { name?: string | null } }).createdUser?.name ?? '—';
      const date = (row.original as { createdAt?: Date }).createdAt;
      const formatted = date ? moment(date).format('DD/MM/YYYY hh:mm A') : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{formatted}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <CreditCustomerRecordActions row={row} />,
  },
];
