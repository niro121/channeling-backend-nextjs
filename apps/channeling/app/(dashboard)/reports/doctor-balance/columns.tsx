'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatLKR } from '@/lib/format-money';
import type { DoctorBalanceReportRow } from '@/types/reports/doctor-balance';

export const DoctorBalanceReportColumns: ColumnDef<DoctorBalanceReportRow>[] = [
  {
    id: 'no',
    header: () => <span className="text-right block">No.</span>,
    cell: ({ row }) => <span className="text-center tabular-nums block">{row.index + 1}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue<number>('status');
      return (
        <span
          className={
            status === 1
              ? 'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700'
              : 'inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-red-100/70 text-red-700'
          }
        >
          {status === 1 ? 'Active' : 'Inactive'}
        </span>
      );
    },
  },
  {
    accessorKey: 'doctorCode',
    header: () => <span className="text-center block">Doctor Code</span>,
    cell: ({ row }) => (
      <span className="text-center block">{row.getValue<string>('doctorCode') ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'doctorName',
    header: 'Doctor Name',
    cell: ({ row }) => row.getValue<string>('doctorName') ?? '-',
  },
  {
    accessorKey: 'speciality',
    header: 'Speciality',
    cell: ({ row }) => row.getValue<string>('speciality') ?? '-',
  },
  {
    accessorKey: 'doctorPhoneNo',
    header: 'Phone',
    cell: ({ row }) => row.getValue<string>('doctorPhoneNo') ?? '-',
  },
  {
    accessorKey: 'doctorAddress',
    header: 'Address',
    cell: ({ row }) => row.getValue<string>('doctorAddress') ?? '-',
  },
  {
    accessorKey: 'doctorBalance',
    header: () => <span className="text-right block">Doctor Balance</span>,
    cell: ({ row }) => (
      <span className="text-right tabular-nums block">
        {formatLKR(row.getValue<number>('doctorBalance') ?? 0)}
      </span>
    ),
  },
];
