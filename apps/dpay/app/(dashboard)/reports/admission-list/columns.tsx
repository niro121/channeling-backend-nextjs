'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { AdmissionListReportRow } from '@/types/reports';
import { StatusBadge } from '@/components/patient-bills/status-badge';
import type { PatientBillStatus } from '@/types/patient-bill';

export const admissionListReportColumns: ColumnDef<AdmissionListReportRow>[] = [
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
    accessorKey: 'patientNicPhone',
    header: 'NIC / Phone',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.patientNicPhone || '—'}</span>
    ),
  },
  {
    accessorKey: 'patientAddress',
    header: 'Address',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.patientAddress || '—'}</span>
    ),
  },
  {
    id: 'admissionAndDischarge',
    header: 'Admission & Discharge',
    cell: ({ row }) => (
      <div className="space-y-0.5 text-sm whitespace-nowrap">
        <p>{format(new Date(row.original.admissionDate), 'yyyy-MM-dd')}</p>
        <p className="text-muted-foreground">
          {row.original.dischargeDate
            ? format(new Date(row.original.dischargeDate), 'yyyy-MM-dd')
            : '—'}
        </p>
      </div>
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
