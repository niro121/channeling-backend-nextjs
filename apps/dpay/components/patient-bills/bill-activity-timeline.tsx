import { format } from 'date-fns';
import { CheckCircle2, Clock, Plus, Receipt, XCircle } from 'lucide-react';
import type { PatientBillReceipt, PatientBillStatus } from '@/types/patient-bill';
import { PATIENT_BILL_PAYMENT_METHODS } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';

type BillActivityTimelineProps = {
  createdAt: string;
  createdByName?: string | null;
  outstandingAmount: number;
  receipts?: PatientBillReceipt[];
  status?: PatientBillStatus;
  canceledAt?: string | null;
  canceledByName?: string | null;
};

function paymentMethodLabel(method: string) {
  return PATIENT_BILL_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

function formatPaymentMeta(receipt: PatientBillReceipt) {
  const date = format(new Date(receipt.paymentDate), 'yyyy-MM-dd');
  const method = paymentMethodLabel(receipt.paymentMethod);
  const reference = receipt.referenceNumber?.trim();
  return reference ? `${date} • ${method} • ${reference}` : `${date} • ${method}`;
}

type TimelineItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  isLast?: boolean;
  iconClassName?: string;
};

function TimelineItem({
  icon,
  title,
  subtitle,
  isLast,
  iconClassName = 'bg-emerald-800 text-white',
}: TimelineItemProps) {
  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-4 top-8 bottom-0 w-px -translate-x-1/2 bg-border"
          aria-hidden
        />
      )}
      <div
        className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export function BillActivityTimeline({
  createdAt,
  createdByName,
  outstandingAmount,
  receipts = [],
  status,
  canceledAt,
  canceledByName,
}: BillActivityTimelineProps) {
  const createdWhen = format(new Date(createdAt), 'yyyy-MM-dd HH:mm');
  const createdWho = createdByName?.trim();
  const createdSubtitle = createdWho
    ? `${createdWhen} • by ${createdWho}`
    : createdWhen;
  const paymentEvents = [...receipts].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );
  const isCancelled = status === 'cancelled';
  const isClosed = status === 'closed';
  const isFullySettled =
    !isCancelled && !isClosed && outstandingAmount <= 0 && paymentEvents.length > 0;

  const items: {
    key: string;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    iconClassName?: string;
  }[] = [
    {
      key: 'created',
      icon: <Plus className="h-4 w-4" />,
      title: 'Bill Created',
      subtitle: createdSubtitle,
    },
    ...paymentEvents.map((receipt) => ({
      key: receipt.id,
      icon: <Receipt className="h-4 w-4" />,
      title: `Payment received — ${formatLkr(receipt.amountPaid)}`,
      subtitle: formatPaymentMeta(receipt),
    })),
  ];

  if (isCancelled) {
    const when = canceledAt
      ? format(new Date(canceledAt), 'yyyy-MM-dd HH:mm')
      : null;
    const who = canceledByName?.trim();
    const subtitleParts = [
      when,
      who ? `by ${who}` : null,
    ].filter(Boolean);

    items.push({
      key: 'cancelled',
      icon: <XCircle className="h-4 w-4" />,
      title: 'Bill Cancelled',
      subtitle: subtitleParts.join(' • ') || 'Cancelled',
      iconClassName: 'bg-red-600 text-white',
    });
  } else if (isClosed) {
    items.push({
      key: 'closed',
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: 'Bill Closed',
      subtitle: 'Bill is locked and cannot be modified',
      iconClassName: 'bg-slate-700 text-white',
    });
  } else if (isFullySettled) {
    const lastPayment = paymentEvents[paymentEvents.length - 1];
    items.push({
      key: 'settled',
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: 'Fully Settled',
      subtitle: lastPayment
        ? `Ready to close • ${format(new Date(lastPayment.paymentDate), 'yyyy-MM-dd')}`
        : 'Ready to close',
    });
  } else if (status === 'draft') {
    items.push({
      key: 'draft',
      icon: <Clock className="h-4 w-4" />,
      title: 'Awaiting doctor charges',
      subtitle: 'Draft admission — add line items to continue billing',
      iconClassName: 'bg-sky-600 text-white',
    });
  } else if (outstandingAmount > 0) {
    items.push({
      key: 'awaiting',
      icon: <Clock className="h-4 w-4" />,
      title: `Awaiting ${formatLkr(outstandingAmount)}`,
      subtitle: 'Outstanding balance remaining',
      iconClassName: 'bg-orange-500 text-white',
    });
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="p-5 border-b">
        <h2 className="text-base font-semibold">Activity Timeline</h2>
      </div>

      <div className="p-5">
        {items.map((item, index) => (
          <TimelineItem
            key={item.key}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            iconClassName={item.iconClassName}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
