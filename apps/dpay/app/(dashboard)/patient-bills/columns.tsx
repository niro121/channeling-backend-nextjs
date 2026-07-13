'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { PatientBill } from '@/types/patient-bill';
import { StatusBadge } from '@/components/patient-bills/status-badge';

function formatAmount(amount: number) {
  return `LKR ${amount.toLocaleString('en-LK')}`;
}

export const patientBillColumns: ColumnDef<PatientBill>[] = [
  {
    id: 'billNo',
    header: 'BXT / Bill No',
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <Link
          href={`/patient-bills/${id}`}
          className="block space-y-0.5 text-primary hover:underline underline-offset-2"
          title="View bill details"
        >
          {row.original.bxtNo && (
            <p className="font-medium text-sm">{row.original.bxtNo}</p>
          )}
          <p className="text-sm text-muted-foreground">{row.original.billNo}</p>
        </Link>
      );
    },
  },
  {
    id: 'patient',
    header: 'Patient',
    cell: ({ row }) => (
      <p className="font-medium text-sm">{row.original.patient.name}</p>
    ),
  },
  {
    id: 'admission',
    header: 'Admission & Discharge',
    cell: ({ row }) => (
      <div className="space-y-0.5 text-sm">
        <p>{format(new Date(row.original.admissionDate), 'dd MMM yyyy')}</p>
        <p className="text-muted-foreground">
          {row.original.dischargeDate
            ? format(new Date(row.original.dischargeDate), 'dd MMM yyyy')
            : '—'}
        </p>
      </div>
    ),
  },
  {
    id: 'amounts',
    header: 'Total / Paid',
    cell: ({ row }) => (
      <div className="space-y-0.5 text-sm tabular-nums">
        <p>Total {formatAmount(row.original.totalAmount)}</p>
        <p className="text-muted-foreground">Paid {formatAmount(row.original.paidAmount)}</p>
      </div>
    ),
  },
  {
    accessorKey: 'outstandingAmount',
    header: 'Outstanding',
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {formatAmount(row.original.outstandingAmount)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];
