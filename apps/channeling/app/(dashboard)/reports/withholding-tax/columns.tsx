'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import type { WithholdingTaxReportRow } from '@/types/report';

export const WithholdingTaxReportColumns: ColumnDef<WithholdingTaxReportRow>[] = [
  {
    accessorKey: 'sNo',
    header: () => <span className="whitespace-nowrap">S.No</span>
  },
  {
    accessorKey: 'docDate',
    header: () => <span className="whitespace-nowrap">Doc Date</span>,
    cell: ({ row }) => {
      const value = row.getValue<Date | null>('docDate');
      return value ? moment(value).format('DD/MM/YYYY HH:mm') : '-';
    }
  },
  {
    accessorKey: 'docNo',
    header: () => <span className="whitespace-nowrap">Doc No</span>
  },
  {
    accessorKey: 'consultant',
    header: () => <span className="whitespace-nowrap">Consultant</span>
  },
  {
    accessorKey: 'speciality',
    header: () => <span className="whitespace-nowrap">Speciality</span>
  },
  {
    accessorKey: 'remarks',
    header: () => <span className="whitespace-nowrap">Remarks</span>
  },
  {
    accessorKey: 'totalAmt',
    header: () => <span className="text-right block whitespace-nowrap">Total Amt</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('totalAmt'))}</span>
  },
  {
    accessorKey: 'taxPercent',
    header: () => <span className="text-right block whitespace-nowrap">Tax %</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{row.getValue<number>('taxPercent').toFixed(2)}</span>
  },
  {
    accessorKey: 'holdingTax',
    header: () => <span className="text-right block whitespace-nowrap">Holding Tax</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('holdingTax'))}</span>
  },
  {
    accessorKey: 'netAmt',
    header: () => <span className="text-right block whitespace-nowrap">Net Amt</span>,
    cell: ({ row }) => <span className="text-right tabular-nums font-medium block">{formatLKR(row.getValue<number>('netAmt'))}</span>
  }
];
