'use client';

import moment from 'moment';
import { ColumnDef } from '@tanstack/react-table';
import { formatLKR } from '@/lib/format-money';
import type { ChannelReportReceiptWiseRow } from '@/types/reports/channel-report-receipt-wise';

export const ChannelReportReceiptWiseColumns: ColumnDef<ChannelReportReceiptWiseRow>[] = [
  {
    id: 'no',
    header: 'No.',
    cell: ({ row }) => <span className="tabular-nums">{row.index + 1}</span>,
  },
  { accessorKey: 'receiptScope', header: 'Type' },
  { accessorKey: 'receiptNo', header: 'Receipt No' },
  {
    accessorKey: 'receiptDate',
    header: 'Receipt Date',
    cell: ({ row }) =>
      row.original.receiptDate ? moment(row.original.receiptDate).format('DD/MM/YYYY hh:mm A') : '-',
  },
  { accessorKey: 'receiptMethod', header: 'Payment Method' },
  { accessorKey: 'transactionType', header: 'Transaction Type' },
  { accessorKey: 'cancelReason', header: 'Cancel Reason' },
  { accessorKey: 'reversedReceiptNo', header: 'Reversed Receipt' },
  {
    accessorKey: 'receiptAmount',
    header: () => <span className="block text-right">Amount</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums font-semibold">{formatLKR(Number(row.original.receiptAmount ?? 0))}</span>
    ),
  },
  {
    accessorKey: 'whdAmount',
    header: () => <span className="block text-right">WHT</span>,
    cell: ({ row }) => {
      const whd = Number(row.original.whdAmount ?? 0);
      return (
        <span className="block text-right tabular-nums">
          {whd !== 0 ? formatLKR(whd) : '-'}
        </span>
      );
    },
  },
  {
    accessorKey: 'netAmount',
    header: () => <span className="block text-right">Net Amount</span>,
    cell: ({ row }) => (
      <span className="block text-right tabular-nums font-semibold">
        {formatLKR(Number(row.original.netAmount ?? row.original.receiptAmount ?? 0))}
      </span>
    ),
  },
  { accessorKey: 'appointmentNo', header: 'App No' },
  {
    accessorKey: 'sessionDate',
    header: 'Session Date',
    cell: ({ row }) => (row.original.sessionDate ? moment(row.original.sessionDate).format('DD/MM/YYYY') : '-'),
  },
  { accessorKey: 'sessionTime', header: 'Session Time' },
  { accessorKey: 'consultant', header: 'Consultant' },
  { accessorKey: 'patientName', header: 'Patient' },
  { accessorKey: 'bookingStatus', header: 'Booking Status' },
  { accessorKey: 'agency', header: 'Agency' },
  { accessorKey: 'creditCustomer', header: 'Credit Customer' },
  { accessorKey: 'creator', header: 'Creator' },
];
