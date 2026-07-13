'use client';

import { Badge } from '@archmage/ui';
import type { PatientBillStatus } from '@/types/patient-bill';

const STATUS_CONFIG: Record<
  PatientBillStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  pending: { label: 'Pending', variant: 'secondary' },
  partial: { label: 'Partial', variant: 'outline' },
  paid: { label: 'Paid', variant: 'default' },
  closed: { label: 'Closed', variant: 'secondary' },
};

type StatusBadgeProps = {
  status: PatientBillStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, variant } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
