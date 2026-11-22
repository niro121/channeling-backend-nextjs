'use client';

import { CustomDialog } from '@archmage/ui';
import { formatAmount, formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type { PerformanceAllowanceRecord } from '@/types/payroll';

type DialogViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: PerformanceAllowanceRecord | null;
};

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export default function DialogView({ open, setOpen, record }: DialogViewProps) {
  const title = record
    ? `Performance Allowance · ${record.staffName || 'Staff'}`
    : 'Allowance details';

  const valueDisplay = record
    ? record.mode === 'percentage'
      ? `${formatAmount(record.value, { maximumFractionDigits: 2 })}%`
      : formatLkr(record.value)
    : '—';

  const rows = record
    ? [
        { label: 'Employee', value: record.staffName || '—' },
        { label: 'Employee code', value: record.staffCode || '—' },
        { label: 'Department', value: record.department || '—' },
        { label: 'Designation', value: record.designation || '—' },
        {
          label: 'Type',
          value: record.mode === 'percentage' ? 'Percentage' : 'Fixed value'
        },
        {
          label: record.mode === 'percentage' ? 'Percentage' : 'Value',
          value: valueDisplay
        },
        { label: 'Effective from', value: formatDateOnly(record.effectiveFrom) },
        { label: 'Effective to', value: formatDateOnly(record.effectiveTo) },
        {
          label: 'Created',
          value: record.createdBy
            ? `${record.createdBy}${
                record.createdAt
                  ? ` · ${formatDateTime(record.createdAt)}`
                  : ''
              }`
            : '—'
        },
        {
          label: 'Updated',
          value: record.updatedBy
            ? `${record.updatedBy}${
                record.updatedAt
                  ? ` · ${formatDateTime(record.updatedAt)}`
                  : ''
              }`
            : '—'
        }
      ]
    : [];

  return (
    <CustomDialog open={open} setOpen={setOpen} title={title}>
      <div className="space-y-4 py-4">
        {record ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-md border border-border bg-muted/20 px-3 py-2"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            No allowance selected.
          </p>
        )}
      </div>
    </CustomDialog>
  );
}
