'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { formatLKR } from '@/lib/format-money';
import type { DpayDoctorBalanceReportRow } from '@/types/reports/dpay-doctor-balance';

function monthStart(asOf: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? `${asOf.slice(0, 8)}01` : asOf;
}

export function buildDpayDoctorBalanceColumns(
  canOpenStatement: boolean
): ColumnDef<DpayDoctorBalanceReportRow>[] {
  const columns: ColumnDef<DpayDoctorBalanceReportRow>[] = [
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
      accessorKey: 'accountCode',
      header: 'DPAY Account',
      cell: ({ row }) => row.getValue<string>('accountCode') ?? '-',
    },
    {
      accessorKey: 'doctorBalance',
      header: () => <span className="text-right block">DPAY Balance</span>,
      cell: ({ row }) => (
        <span className="text-right tabular-nums block">
          {formatLKR(row.getValue<number>('doctorBalance') ?? 0)}
        </span>
      ),
    },
  ];

  if (canOpenStatement) {
    columns.push({
      id: 'statement',
      header: () => <span className="text-center block">Statement</span>,
      cell: ({ row }) => {
        const asOf = row.original.asOfDate;
        const href = `/reports/dpay-doctor-statement?doctorId=${encodeURIComponent(row.original.id)}&dateFrom=${monthStart(asOf)}&dateTo=${encodeURIComponent(asOf)}`;
        return (
          <Link href={href} className="text-primary underline underline-offset-2">
            View
          </Link>
        );
      },
    });
  }

  return columns;
}
