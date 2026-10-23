'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@archmage/ui';
import type { ReceiptListItem } from '@/types/receipt';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import { ReceiptStatusBadge } from '@/components/receipts/receipt-status-badge';
import { ReceiptManagerRecordActions } from './record-actions';
import { useReceiptManagerView } from './receipt-manager-view-context';

export const receiptManagerColumns: ColumnDef<ReceiptListItem>[] = [
  {
    accessorKey: 'receiptNumber',
    header: 'Receipt No',
    cell: ({ row }) => {
      const openView = useReceiptManagerView()?.openView;
      const label = row.original.receiptNumber;
      if (openView) {
        return (
          <button
            type="button"
            onClick={() => openView(row.original.id)}
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
    cell: ({ row }) => <span className="font-medium">{row.original.billNumber}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <ReceiptStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'paymentDate',
    header: 'Payment Date',
    cell: ({ row }) => {
      const d = new Date(row.original.paymentDate);
      return (
        <div className="space-y-0.5 text-sm">
          <p className="whitespace-nowrap">{format(d, 'yyyy-MM-dd')}</p>
          <p className="text-muted-foreground whitespace-nowrap">{format(d, 'HH:mm:ss')}</p>
        </div>
      );
    },
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
    accessorKey: 'amountPaid',
    header: 'Amount',
    cell: ({ row }) => (
      <span
        className={
          row.original.status === 'cancelled'
            ? 'tabular-nums font-semibold text-muted-foreground line-through'
            : 'tabular-nums font-semibold text-emerald-700'
        }
      >
        {formatLkr(row.original.amountPaid)}
      </span>
    ),
  },
  {
    accessorKey: 'locationName',
    header: 'Location',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {row.original.locationName?.trim() || '—'}
      </span>
    ),
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <ReceiptManagerRecordActions receiptId={row.original.id} />
      </div>
    ),
  },
];
