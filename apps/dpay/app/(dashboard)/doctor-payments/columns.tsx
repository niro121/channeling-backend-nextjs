'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { DoctorPaymentListItem } from '@/types/doctor-payment';
import { DOCTOR_PAYMENT_METHODS } from '@/types/doctor-payment';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { DoctorPaymentStatusBadge } from '@/components/doctor-payments/status-badge';
import { DoctorPaymentRecordActions } from './record-actions';

function methodLabel(method: string) {
  return DOCTOR_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

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
        {methodLabel(row.original.method)}
      </span>
    ),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap">{formatLkr(row.original.total)}</span>
    ),
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
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => (
      <span
        className="max-w-[140px] truncate block text-sm text-muted-foreground"
        title={row.original.remarks || undefined}
      >
        {row.original.remarks?.trim() || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'cancelReason',
    header: 'Cancel Reason',
    cell: ({ row }) => {
      const reason = row.original.cancelReason?.trim();
      if (!reason) return <span className="text-muted-foreground">—</span>;
      return (
        <span
          className="max-w-[160px] truncate block text-sm text-destructive"
          title={reason}
        >
          {reason}
        </span>
      );
    },
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
