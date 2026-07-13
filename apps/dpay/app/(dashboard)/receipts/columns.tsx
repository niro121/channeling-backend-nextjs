'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@archmage/ui';
import type { ReceiptListItem } from '@/types/receipt';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import { ReceiptRecordActions } from './record-actions';
import { useReceiptsView } from './receipts-view-context';

export const receiptColumns: ColumnDef<ReceiptListItem>[] = [
  {
    accessorKey: 'receiptNumber',
    header: 'Receipt No',
    cell: ({ row }) => {
      const openView = useReceiptsView()?.openView;
      const label = row.original.receiptNumber;
      if (openView) {
        return (
          <button
            type="button"
            onClick={() => openView(row.original)}
            className="font-medium text-foreground hover:underline text-left"
          >
            {label}
          </button>
        );
      }
      return <span className="font-medium">{label}</span>;
    },
  },
  {
    accessorKey: 'billNumber',
    header: 'Bill No',
    cell: ({ row }) => (
      <Link
        href={`/patient-bills/${row.original.billId}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.billNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'paymentDate',
    header: 'Payment Date',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.paymentDate), 'yyyy-MM-dd')}
      </span>
    ),
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Method',
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-normal">
        {paymentMethodLabel(row.original.paymentMethod)}
      </Badge>
    ),
  },
  {
    accessorKey: 'referenceNumber',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.referenceNumber?.trim() || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'amountPaid',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="tabular-nums font-semibold text-emerald-700">
        {formatLkr(row.original.amountPaid)}
      </span>
    ),
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <ReceiptRecordActions row={row} />
      </div>
    ),
  },
];
