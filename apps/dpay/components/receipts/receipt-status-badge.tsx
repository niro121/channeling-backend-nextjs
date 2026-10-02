'use client';

import { Badge } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { PatientBillReceiptStatus } from '@/types/patient-bill';

const STATUS_CONFIG: Record<
  PatientBillReceiptStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
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

type ReceiptStatusBadgeProps = {
  status: PatientBillReceiptStatus;
  className?: string;
};

export function ReceiptStatusBadge({ status, className }: ReceiptStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  return (
    <Badge variant="outline" className={cn('font-medium', config.className, className)}>
      {config.label}
    </Badge>
  );
}
