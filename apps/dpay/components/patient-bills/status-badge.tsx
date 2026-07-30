'use client';

import { Badge } from '@archmage/ui';
import { cn } from '@/lib/utils';
import type { PatientBillStatus } from '@/types/patient-bill';

const STATUS_CONFIG: Record<
  PatientBillStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'border-transparent bg-sky-100 text-sky-900 hover:bg-sky-100',
  },
  pending: {
    label: 'Pending',
    className: 'border-transparent bg-slate-100 text-slate-800 hover:bg-slate-100',
  },
  partial: {
    label: 'Partially Paid',
    className: 'border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100',
  },
  paid: {
    label: 'Paid',
    className: 'border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  },
  closed: {
    label: 'Closed',
    className: 'border-transparent bg-indigo-100 text-indigo-900 hover:bg-indigo-100',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-transparent bg-red-100 text-red-800 hover:bg-red-100',
  },
};

type StatusBadgeProps = {
  status: PatientBillStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={cn('font-medium', config.className, className)}>
      {config.label}
    </Badge>
  );
}
