'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { ReceiptReportRow } from '@/types/reports';
import { formatReportLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import { ReceiptStatusBadge } from '@/components/receipts/receipt-status-badge';

export const receiptReportColumns: ColumnDef<ReceiptReportRow>[] = [
  {
    accessorKey: 'receiptNumber',
    header: 'Receipt No',
    cell: ({ row }) => (
      <Link
        href={`/patient-bills/${row.original.billId}`}
        className="font-medium text-primary hover:underline whitespace-nowrap"
      >
        {row.original.receiptNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <ReceiptStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'patientName',
    header: 'Patient Name',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.patientName || '—'}</span>
    ),
  },
  {
    accessorKey: 'billNumber',
    header: 'Bill Number',
    cell: ({ row }) => (
      <Link
        href={`/patient-bills/${row.original.billId}`}
        className="font-medium text-muted-foreground hover:text-primary hover:underline"
      >
        {row.original.billNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'paymentDate',
    header: 'Payment Date',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {format(new Date(row.original.paymentDate), 'yyyy-MM-dd')}
      </span>
    ),
  },
  {
    accessorKey: 'paymentMethod',
    header: 'Payment Method',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {paymentMethodLabel(row.original.paymentMethod)}
      </span>
    ),
  },
  {
    accessorKey: 'amountPaid',
    header: 'Amount Paid',
    cell: ({ row }) => {
      const isRefund = row.original.status === 'refund';
      return (
        <span
          className={
            isRefund
              ? 'tabular-nums font-semibold text-red-700 whitespace-nowrap'
              : 'tabular-nums font-semibold text-emerald-700 whitespace-nowrap'
          }
        >
          {formatReportLkr(row.original.amountPaid, isRefund)}
        </span>
      );
    },
  },
];
