'use client';

import { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import type { ConsultantPaymentsReportRow } from '@/types/report';

export const ConsultantPaymentsReportColumns: ColumnDef<ConsultantPaymentsReportRow>[] = [
  {
    accessorKey: 'sNo',
    header: () => <span className="whitespace-nowrap">S.No</span>
  },
  {
    accessorKey: 'branch',
    header: () => <span className="whitespace-nowrap">Branch</span>
  },
  {
    accessorKey: 'consultant',
    header: () => <span className="whitespace-nowrap">Consultant</span>,
    cell: ({ row }) => {
      const consultant = row.original.consultant;
      const code = row.original.consultantCode;
      return (
        <div>
          <div className="font-medium">{consultant ?? '-'}</div>
          {code && <div className="text-xs text-muted-foreground">Code: {code}</div>}
        </div>
      );
    }
  },
  {
    accessorKey: 'paymentReceipt',
    header: () => <span className="whitespace-nowrap">Payment Receipt</span>
  },
  {
    accessorKey: 'channelReceipt',
    header: () => <span className="whitespace-nowrap">Channel Receipt</span>
  },
  {
    accessorKey: 'consultationSession',
    header: () => <span className="whitespace-nowrap">Consultation Date/Session Time</span>
  },
  {
    accessorKey: 'patientName',
    header: () => <span className="whitespace-nowrap">Patient Name</span>
  },
  {
    accessorKey: 'modeOfPay',
    header: () => <span className="whitespace-nowrap">Mode of Pay</span>
  },
  {
    accessorKey: 'consultationCharge',
    header: () => <span className="whitespace-nowrap">Consultation Charge</span>,
    cell: ({ row }) => {
      const amount = row.getValue<number>('consultationCharge');
      return <span className="tabular-nums">{formatLKR(amount)}</span>;
    }
  },
  {
    accessorKey: 'discountAmount',
    header: () => <span className="whitespace-nowrap">Discount Amount</span>,
    cell: ({ row }) => {
      const amount = row.getValue<number>('discountAmount');
      return <span className="tabular-nums">{formatLKR(amount)}</span>;
    }
  },
  {
    accessorKey: 'netAmount',
    header: () => <span className="whitespace-nowrap">Net Amount</span>,
    cell: ({ row }) => {
      const amount = row.getValue<number>('netAmount');
      return <span className="tabular-nums font-medium">{formatLKR(amount)}</span>;
    }
  },
  {
    accessorKey: 'paymentStatus',
    header: () => <span className="whitespace-nowrap">Payment Status</span>,
    cell: ({ row }) => {
      const status = row.getValue<string>('paymentStatus');
      const isPaid = status === 'Paid';
      return (
        <span className={isPaid ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
          {status ?? '-'}
        </span>
      );
    }
  },
  {
    accessorKey: 'paidBy',
    header: () => <span className="whitespace-nowrap">Paid By</span>
  },
  {
    accessorKey: 'paidDate',
    header: () => <span className="whitespace-nowrap">Paid Date</span>,
    cell: ({ row }) => {
      const date = row.getValue<Date | null>('paidDate');
      return date ? moment(date).format('DD/MM/YYYY HH:mm') : '-';
    }
  },
  {
    accessorKey: 'handedBy',
    header: () => <span className="whitespace-nowrap">Handed By</span>
  }
];
