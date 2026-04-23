'use client';

import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import type { ChannelDiscountReportRow } from '@/types/reports/channel-discount-report';

function formatSessionCell(date: Date | null, startUnix: number | null, endUnix: number | null): string {
  const datePart = date ? moment(date).format('DD-MM-YYYY') : '-';
  const start = startUnix != null ? moment.unix(startUnix).format('hh:mm A') : '-';
  const end = endUnix != null ? moment.unix(endUnix).format('hh:mm A') : '-';
  return `${datePart}\n${start} - ${end}`;
}

export const ChannelDiscountReportColumns: ColumnDef<ChannelDiscountReportRow>[] = [
  {
    accessorKey: 'bookingDate',
    header: () => <span className="whitespace-nowrap">Booking Date</span>,
    cell: ({ row }) => {
      const d = row.getValue<Date | null>('bookingDate');
      return d ? moment(d).format('DD-MM-YYYY hh:mm A') : '-';
    }
  },
  {
    id: 'session',
    header: () => <span className="whitespace-nowrap">Session</span>,
    cell: ({ row }) => (
      <span className="whitespace-pre-line">
        {formatSessionCell(row.original.sessionDate, row.original.sessionStartTime, row.original.sessionEndTime)}
      </span>
    )
  },
  {
    accessorKey: 'billNo',
    header: () => <span className="whitespace-nowrap">Bill No</span>
  },
  {
    accessorKey: 'patientName',
    header: () => <span className="whitespace-nowrap">Patient Name</span>
  },
  {
    accessorKey: 'doctor',
    header: () => <span className="whitespace-nowrap">Doctor</span>
  },
  {
    accessorKey: 'type',
    header: () => <span className="whitespace-nowrap">Type</span>
  },
  {
    accessorKey: 'hospitalFee',
    header: () => <span className="text-right block whitespace-nowrap">Hospital Fee</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('hospitalFee'))}</span>
  },
  {
    accessorKey: 'hospitalFeeDiscount',
    header: () => <span className="text-right block whitespace-nowrap">Hospital Fee Discount</span>,
    cell: ({ row }) => (
      <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('hospitalFeeDiscount'))}</span>
    )
  },
  {
    accessorKey: 'professionalFee',
    header: () => <span className="text-right block whitespace-nowrap">Professional Fee</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('professionalFee'))}</span>
  },
  {
    accessorKey: 'professionalFeeDiscount',
    header: () => <span className="text-right block whitespace-nowrap">Professional Fee Discount</span>,
    cell: ({ row }) => (
      <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('professionalFeeDiscount'))}</span>
    )
  },
  {
    accessorKey: 'discount',
    header: () => <span className="text-right block whitespace-nowrap">Discount</span>,
    cell: ({ row }) => <span className="text-right tabular-nums font-semibold block">{formatLKR(row.getValue<number>('discount'))}</span>
  },
  {
    accessorKey: 'autoDiscountScheme',
    header: () => <span className="whitespace-nowrap">Auto Discount Scheme</span>
  },
  {
    accessorKey: 'discountScheme',
    header: () => <span className="whitespace-nowrap">Discount Scheme</span>
  }
];
