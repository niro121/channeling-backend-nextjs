'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { DoctorPaymentReportRow } from '@/types/reports';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { DoctorPaymentStatusBadge } from '@/components/doctor-payments/status-badge';
import { cn } from '@/lib/utils';

export const doctorPaymentReportColumns: ColumnDef<DoctorPaymentReportRow>[] = [
  {
    id: 'doctor',
    header: 'Doctor Name',
    cell: ({ row }) => (
      <div className="min-w-[160px]">
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
    accessorKey: 'receiptNumber',
    header: 'Receipt No',
    cell: ({ row }) => (
      <span className="font-medium text-primary whitespace-nowrap">
        {row.original.receiptNumber}
      </span>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => (
      <span className="tabular-nums font-semibold whitespace-nowrap">
        {formatLkr(row.original.totalAmount)}
      </span>
    ),
  },
  {
    accessorKey: 'paidAmount',
    header: 'Paid Amount',
    cell: ({ row }) => {
      const amount = row.original.paidAmount;
      if (amount <= 0) {
        return (
          <span className="tabular-nums text-muted-foreground whitespace-nowrap">
            {formatLkr(0)}
          </span>
        );
      }
      return (
        <span
          className={cn(
            'inline-flex tabular-nums font-medium whitespace-nowrap rounded-full px-2.5 py-0.5',
            'bg-emerald-50 text-emerald-700'
          )}
        >
          {formatLkr(amount)}
        </span>
      );
    },
  },
  {
    accessorKey: 'dueAmount',
    header: 'Due Amount',
    cell: ({ row }) => {
      const amount = row.original.dueAmount;
      if (amount <= 0) {
        return (
          <span className="tabular-nums text-muted-foreground whitespace-nowrap">
            {formatLkr(0)}
          </span>
        );
      }
      return (
        <span
          className={cn(
            'inline-flex tabular-nums font-medium whitespace-nowrap rounded-full px-2.5 py-0.5',
            'bg-red-50 text-red-700'
          )}
        >
          {formatLkr(amount)}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <DoctorPaymentStatusBadge status={row.original.status} />,
  },
];
