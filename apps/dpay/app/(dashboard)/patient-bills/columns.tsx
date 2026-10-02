'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import type { PatientBill } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { StatusBadge } from '@/components/patient-bills/status-badge';
import { PatientBillRecordActions } from '@/components/patient-bills/patient-bill-record-actions';

function formatAuditDate(value?: string | null) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy hh:mm a');
  } catch {
    return '—';
  }
}

function AuditCell({
  name,
  date,
}: {
  name?: string | null;
  date?: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span>{name?.trim() || '—'}</span>
      <span className="text-muted-foreground">{formatAuditDate(date)}</span>
    </div>
  );
}

export const patientBillColumns: ColumnDef<PatientBill>[] = [
  {
    id: 'billNo',
    header: 'Bill No',
    cell: ({ row }) => (
      <p className="font-medium text-sm">{row.original.billNo}</p>
    ),
  },
  {
    id: 'bhtNo',
    header: 'BHT No',
    cell: ({ row }) => (
      <p className="text-sm">{row.original.bxtNo ?? '—'}</p>
    ),
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
        <p>Total {formatLkr(row.original.totalAmount)}</p>
        <p className="text-muted-foreground">Paid {formatLkr(row.original.paidAmount)}</p>
      </div>
    ),
  },
  {
    accessorKey: 'outstandingAmount',
    header: 'Outstanding',
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {formatLkr(row.original.outstandingAmount)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: ({ row }) => (
      <AuditCell
        name={row.original.updatedByName}
        date={row.original.updatedAt}
      />
    ),
  },
  {
    id: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <AuditCell
        name={row.original.createdByName}
        date={row.original.createdAt}
      />
    ),
  },
  {
    id: 'actions',
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="text-right" onClick={(event) => event.stopPropagation()}>
        <PatientBillRecordActions row={row} />
      </div>
    ),
  },
];
