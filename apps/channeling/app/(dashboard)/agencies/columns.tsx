'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Agency } from '@/types/agency';
import { formatLKR } from '@/lib/format-money';
import AgencyRecordActions from './record-actions';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import moment from 'moment';

export const AgencyColumns: ColumnDef<Agency>[] = [
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
    enableHiding: false
  },
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => {
      const code = row.getValue('code') as string;
      return code || <span className="text-muted-foreground">-</span>;
    }
  },
  {
    accessorKey: 'name',
    header: 'Agency Name',
    cell: ({ row }) => {
      const name = row.getValue('name') as string;
      const id = row.original.id;
      if (!id) return name || <span className="text-muted-foreground">-</span>;
      return (
        <Link href={`/agencies/${id}/edit`} className="text-primary hover:underline font-medium">
          {name || '-'}
        </Link>
      );
    }
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const balance = row.getValue('balance') as number;
      return <span className="tabular-nums">{balance != null ? formatLKR(balance) : '0.00'}</span>;
    }
  },
  {
    id: 'creditViolation',
    header: 'Credit Violation',
    cell: ({ row }) => {
      const isViolation = !!row.original.isCreditLimitViolation;
      if (!isViolation) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help items-center gap-1 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Credit limit violation is active</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: 'account',
    header: 'Account',
    cell: ({ row }) => {
      const accountId = row.original.accountId;
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
      const status = row.getValue('status') as number;
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
          {isActive ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isActive ? 'Published' : 'Unpublished'}
        </Badge>
      );
    }
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => {
      const name = row.original.updatedUser?.name ?? '—';
      const date = row.original.updatedAt
        ? moment(row.original.updatedAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{date}</span>
        </div>
      );
    }
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => {
      const name = row.original.createdUser?.name ?? '—';
      const date = row.original.createdAt
        ? moment(row.original.createdAt).format('DD/MM/YYYY hh:mm A')
        : '—';
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          <span>{name}</span>
          <span className="text-muted-foreground">{date}</span>
        </div>
      );
    }
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => <AgencyRecordActions row={row} />
  }
];
