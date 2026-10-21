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
    header: () => <span>Booking Date</span>,
    cell: ({ row }) => {
      const d = row.getValue<Date | null>('bookingDate');
      return d ? moment(d).format('DD-MM-YYYY hh:mm A') : '-';
    }
  },
  {
    id: 'session',
    header: () => <span>Session</span>,
    cell: ({ row }) => (
      <span className="whitespace-pre-line">
        {formatSessionCell(row.original.sessionDate, row.original.sessionStartTime, row.original.sessionEndTime)}
      </span>
    )
  },
  {
    accessorKey: 'billNo',
    header: () => <span>Bill No</span>
  },
  {
    accessorKey: 'patientName',
    header: () => <span>Patient Name</span>
  },
  {
    accessorKey: 'doctor',
    header: () => <span>Doctor</span>
  },
  {
    accessorKey: 'type',
    header: () => <span>Type</span>
  },
  {
    accessorKey: 'hospitalFee',
    header: () => <span className="text-right block">Hos Fee</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('hospitalFee'))}</span>
  },
  {
    accessorKey: 'hospitalFeeDiscount',
    header: () => <span className="text-right block">Hos Fee Disc</span>,
    cell: ({ row }) => (
      <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('hospitalFeeDiscount'))}</span>
    )
  },
  {
    accessorKey: 'professionalFee',
    header: () => <span className="text-right block">Pro Fee</span>,
    cell: ({ row }) => <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('professionalFee'))}</span>
  },
  {
    accessorKey: 'professionalFeeDiscount',
    header: () => <span className="text-right block">Pro Fee Disc</span>,
    cell: ({ row }) => (
      <span className="text-right tabular-nums block">{formatLKR(row.getValue<number>('professionalFeeDiscount'))}</span>
    )
  },
  {
    accessorKey: 'discount',
    header: () => <span className="text-right block">Discount</span>,
    cell: ({ row }) => <span className="text-right tabular-nums font-semibold block">{formatLKR(row.getValue<number>('discount'))}</span>
  },
  {
    accessorKey: 'autoDiscountScheme',
    header: () => <span>Auto Disc Scheme</span>
  },
  {
    accessorKey: 'discountScheme',
    header: () => <span>Discount Scheme</span>
  }
];
