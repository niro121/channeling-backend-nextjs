'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { DoctorPaymentListItem } from '@/types/doctor-payment';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import { DoctorPaymentStatusBadge } from '@/components/doctor-payments/status-badge';
import { DoctorPaymentRecordActions } from './record-actions';

export const doctorPaymentColumns: ColumnDef<DoctorPaymentListItem>[] = [
  {
    accessorKey: 'receiptNo',
    header: 'Receipt No',
    cell: ({ row }) => (
      <span className="font-medium whitespace-nowrap">{row.original.receiptNo}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <DoctorPaymentStatusBadge status={row.original.status} />,
  },
  {
    id: 'doctor',
    header: 'Doctor',
    cell: ({ row }) => (
      <div className="min-w-[140px]">
        <p className="font-medium leading-tight">{row.original.doctorName}</p>
        {row.original.doctorSpecialty ? (
          <p className="text-xs text-muted-foreground mt-0.5">
            {row.original.doctorSpecialty}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {paymentMethodLabel(row.original.method)}
      </span>
    ),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => {
      const cancelled = row.original.status === 'cancelled';
      return (
        <span
          className={
            cancelled
              ? 'tabular-nums whitespace-nowrap text-muted-foreground line-through'
              : 'tabular-nums whitespace-nowrap'
          }
        >
          {formatLkr(row.original.total)}
        </span>
      );
    },
  },
  {
    accessorKey: 'wht',
    header: 'WHT',
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground whitespace-nowrap">
        {formatLkr(row.original.wht)}
      </span>
    ),
  },
  {
    accessorKey: 'net',
    header: 'Net',
    cell: ({ row }) => (
      <span className="tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
        {formatLkr(row.original.net)}
      </span>
    ),
  },
  {
    accessorKey: 'createdBy',
    header: 'Created By',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {row.original.createdBy}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      try {
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {format(new Date(row.original.createdAt), 'yyyy-MM-dd')}
          </span>
        );
      } catch {
        return '—';
      }
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right">
        <DoctorPaymentRecordActions row={row} />
      </div>
    ),
  },
];
