'use client';

import { Badge } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { DoctorPaymentStatus } from '@/types/doctor-payment';

const STATUS_CONFIG: Record<
  DoctorPaymentStatus,
  { label: string; className: string }
> = {
  paid: {
    label: 'Paid',
    className: 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-transparent bg-red-100 text-red-800 hover:bg-red-100',
  },
  refund: {
    label: 'Refund',
    className: 'border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100',
  },
};

type StatusBadgeProps = {
  status: DoctorPaymentStatus;
  className?: string;
};

export function DoctorPaymentStatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.paid;
  return (
    <Badge variant="outline" className={cn('font-medium', config.className, className)}>
      {config.label}
    </Badge>
  );
}
