'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { PatientDueReportRow } from '@/types/reports';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { StatusBadge } from '@/components/patient-bills/status-badge';
import type { PatientBillStatus } from '@/types/patient-bill';

export const patientDueReportColumns: ColumnDef<PatientDueReportRow>[] = [
  {
    accessorKey: 'billNumber',
    header: 'Bill No',
    cell: ({ row }) => (
      <Link
        href={`/patient-bills/${row.original.id}`}
        className="font-medium text-primary hover:underline whitespace-nowrap"
      >
        {row.original.billNumber}
      </Link>
    ),
  },
  {
    accessorKey: 'bxtNumber',
    header: 'BHT No',
    cell: ({ row }) => (
      <span className="font-mono text-sm whitespace-nowrap">{row.original.bxtNumber}</span>
    ),
  },
  {
    accessorKey: 'patientName',
    header: 'Patient',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.patientName || '—'}</span>
    ),
  },
  {
    accessorKey: 'admissionDate',
    header: 'Admission Date',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {format(new Date(row.original.admissionDate), 'yyyy-MM-dd')}
      </span>
    ),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap">{formatLkr(row.original.totalAmount)}</span>
    ),
  },
  {
    accessorKey: 'paidAmount',
    header: 'Paid',
    cell: ({ row }) => (
      <span className="tabular-nums text-emerald-700 whitespace-nowrap">
        {formatLkr(row.original.paidAmount)}
      </span>
    ),
  },
  {
    accessorKey: 'dueAmount',
    header: 'Due',
    cell: ({ row }) => (
      <span className="tabular-nums font-semibold text-amber-800 whitespace-nowrap">
        {formatLkr(row.original.dueAmount)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.status as PatientBillStatus} />
    ),
  },
];
