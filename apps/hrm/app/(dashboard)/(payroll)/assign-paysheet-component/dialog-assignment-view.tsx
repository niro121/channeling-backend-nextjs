'use client';

import { CustomDialog } from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type { PaysheetAssignmentRecord } from '@/types/payroll';

type DialogAssignmentViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: PaysheetAssignmentRecord | null;
};

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export default function DialogAssignmentView({
  open,
  setOpen,
  record
}: DialogAssignmentViewProps) {
  const title = record
    ? `Assignment · ${record.staffName || 'Staff'}`
    : 'Assignment details';

  const rows = record
    ? [
        { label: 'Employee', value: record.staffName || '—' },
        { label: 'Employee code', value: record.staffCode || '—' },
        { label: 'Component', value: record.componentName || '—' },
        { label: 'Institution', value: record.institution || '—' },
        { label: 'Department', value: record.department || '—' },
        { label: 'Roster', value: record.roster || '—' },
        { label: 'Designation', value: record.designation || '—' },
        { label: 'Category', value: record.staffCategory || '—' },
        { label: 'Grade', value: record.grade || '—' },
        { label: 'Status', value: record.status },
        { label: 'Effective from', value: formatDateOnly(record.effectiveFrom) },
        { label: 'Effective to', value: formatDateOnly(record.effectiveTo) },
        { label: 'Value', value: formatLkr(record.value) },
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
            No assignment selected.
          </p>
        )}
      </div>
    </CustomDialog>
  );
}
