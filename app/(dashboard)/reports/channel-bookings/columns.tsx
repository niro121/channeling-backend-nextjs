'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import moment from 'moment';
import { ChannelBookingsReportRow } from '@/types/reports/channel-bookings';
import { BOOKING_METHODS } from '@/types/channel-booking';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Paid',
  2: 'Cancel',
  3: 'Refund'
};

const REFUND_LABELS: Record<number, string> = {
  0: 'No Refund',
  1: 'Professional Only',
  2: 'Hospital Only',
  3: 'Full Refund'
};

function formatApplyTime(
  session: { startTime?: Date; endTime?: Date } | null
): string {
  if (!session?.startTime || !session?.endTime) return '-';
  const start = moment(session.startTime).format('hh:mm A');
  const end = moment(session.endTime).format('hh:mm A');
  return `${start} - ${end}`;
}

function formatPatientName(title?: string, name?: string): string {
  const parts = [title, name].filter(Boolean);
  return parts.join(' ').trim() || '-';
}

/**
 * Channel Bookings report columns – ordered appropriately, grouped by doctor.
 */
export const ChannelBookingsReportColumns: ColumnDef<ChannelBookingsReportRow>[] =
  [
    {
      id: 'consultant',
      header: () => <span className="whitespace-nowrap">Consultant</span>,
      cell: ({ row }) => {
        const doctor = (row.original as any).doctor;
        const code = doctor?.code ?? '';
        const name = doctor?.name ?? '-';
        const display = code ? `${code} – ${name}` : name;
        return (
          <div className="max-w-40" title={display}>
            {display}
          </div>
        );
      }
    },
    {
      id: 'speciality',
      header: 'Speciality',
      cell: ({ row }) => {
        const doctor = (row.original as any).doctor;
        const spec = doctor?.speciality?.name;
        return <span className="max-w-28 truncate block">{spec ?? '-'}</span>;
      }
    },
    {
      id: 'applyDate',
      header: () => <span className="whitespace-nowrap">Apply Date</span>,
      cell: ({ row }) => {
        const session = (row.original as any).session;
        const date = session?.date;
        return (
          <span className="whitespace-nowrap">
            {date ? moment(date).format('DD/MM/YYYY') : '-'}
          </span>
        );
      }
    },
    {
      id: 'applyTime',
      header: () => <span className="whitespace-nowrap">Apply Time</span>,
      cell: ({ row }) => {
        const session = (row.original as any).session;
        return (
          <span className="whitespace-nowrap">{formatApplyTime(session)}</span>
        );
      }
    },
    {
      id: 'applyNumber',
      header: 'Apply Number',
      cell: ({ row }) => {
        const n = (row.original as any).appointmentNo;
        return n != null ? String(n) : '-';
      }
    },
    {
      id: 'billNumber',
      header: 'Bill Number',
      cell: ({ row }) => {
        const o = row.original as any;
        const bill = o.receiptNoString ?? o.bookingid_string ?? '';
        return (
          <span className="max-w-24 truncate block" title={bill}>
            {bill || '-'}
          </span>
        );
      }
    },
    {
      id: 'method',
      header: 'Method',
      cell: ({ row }) => {
        const m = (row.original as any).method;
        const name = BOOKING_METHODS.find((x) => x.id === m)?.name;
        return name ?? (m != null ? String(m) : '-');
      }
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = (row.original as any).status;
        const label = STATUS_LABELS[status] ?? String(status);
        const isPaid = status === 1;
        const isPending = status === 0;
        const isCancelOrRefund = status === 2 || status === 3;
        const Icon = isPaid ? CheckCircle2 : isPending ? Clock : isCancelOrRefund ? XCircle : undefined;
        return (
          <Badge
            variant={isPaid ? 'default' : isPending ? 'secondary' : 'outline'}
            className={
              isPaid
                ? 'gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-0'
                : isPending
                  ? 'gap-1 bg-muted text-muted-foreground hover:bg-muted'
                  : 'gap-1'
            }
          >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </Badge>
        );
      }
    },
    {
      id: 'refundStatus',
      header: 'Refund Status',
      cell: ({ row }) => {
        const refund = (row.original as any).refund;
        const label =
          REFUND_LABELS[refund] ?? (refund != null ? String(refund) : '-');
        return <span className="text-xs">{label}</span>;
      }
    },
    {
      id: 'refundedAt',
      header: 'Refunded At',
      cell: ({ row }) => {
        const date = (row.original as any).refundReceiptCreatedAt;
        return (
          <span className="whitespace-nowrap">
            {date ? moment(date).format('DD/MM/YYYY hh:mm A') : '-'}
          </span>
        );
      }
    },
    {
      id: 'patientName',
      header: 'Patient Name',
      cell: ({ row }) => {
        const o = row.original as any;
        return formatPatientName(o.title, o.name);
      }
    },
    {
      id: 'patientNumber',
      header: 'Patient Number',
      cell: ({ row }) => {
        const phone = (row.original as any).phone;
        return <span className="max-w-28 whitespace-nowrap block">{phone ?? '-'}</span>;
      }
    },
    {
      id: 'area',
      header: 'Area',
      cell: ({ row }) => {
        const area = (row.original as any).area;
        return <span className="max-w-24 truncate block">{area ?? '-'}</span>;
      }
    },
    {
      id: 'updater',
      header: 'Updater',
      cell: ({ row }) => {
        const o = row.original as any;
        const name = o.updatedUser?.name ?? '—';
        const date = o.updatedAt
          ? moment(o.updatedAt).format('DD/MM/YYYY hh:mm A')
          : '—';
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <span>{name}</span>
            <span className="text-muted-foreground">{date}</span>
          </div>
        );
      }
    },
    {
      id: 'creator',
      header: 'Creator',
      cell: ({ row }) => {
        const o = row.original as any;
        const name = o.createdUser?.name ?? '—';
        const date = o.createdAt
          ? moment(o.createdAt).format('DD/MM/YYYY hh:mm A')
          : '—';
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            <span>{name}</span>
            <span className="text-muted-foreground">{date}</span>
          </div>
        );
      }
    },
    {
      id: 'hospitalFee',
      header: 'Hospital Fee',
      cell: ({ row }) => {
        const fee = (row.original as any).hospitalFee;
        const n = typeof fee === 'number' ? fee / 100 : 0;
        return <span className="text-right tabular-nums block">{n > 0 ? n.toFixed(2) : '-'}</span>;
      }
    },
    {
      id: 'doctorFee',
      header: 'Doctor Fee',
      cell: ({ row }) => {
        const fee = (row.original as any).professionalFee;
        const n = typeof fee === 'number' ? fee / 100 : 0;
        return <span className="text-right tabular-nums block">{n > 0 ? n.toFixed(2) : '-'}</span>;
      }
    },
    {
      id: 'discount',
      header: 'Discount',
      cell: ({ row }) => {
        const d = (row.original as any).discount;
        const n = typeof d === 'number' ? d / 100 : 0;
        return <span className="text-right tabular-nums block">{n > 0 ? n.toFixed(2) : '-'}</span>;
      }
    },
    {
      id: 'totalFee',
      header: 'Total Fee',
      cell: ({ row }) => {
        const amt = (row.original as any).amount;
        const n = typeof amt === 'number' ? amt / 100 : 0;
        return <span className="text-right tabular-nums block">{n > 0 ? n.toFixed(2) : '-'}</span>;
      }
    },
    {
      id: 'paymentMode',
      header: 'Payment Mode',
      cell: ({ row }) => {
        const pm = (row.original as any).receiptPaymentMethod;
        const name =
          pm != null ? (PAYMENT_METHOD_NAMES[pm] ?? String(pm)) : '-';
        return <span className="text-xs">{name}</span>;
      }
    },
    {
      id: 'agentName',
      header: 'Agent Name',
      cell: ({ row }) => {
        const agency = (row.original as any).agency;
        return (
          <span className="max-w-28 truncate block">{agency?.name ?? '-'}</span>
        );
      }
    }
  ];
