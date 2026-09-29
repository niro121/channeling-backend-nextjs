'use client';

import { CustomDialog } from '@archmage/ui';
import { formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import type { LoanAdvanceRecord } from '@/types/payroll';

type DialogLoanViewProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: LoanAdvanceRecord | null;
};

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  return formatDateTime(value, 'dd MMM yyyy');
}

export default function DialogLoanView({
  open,
  setOpen,
  record
}: DialogLoanViewProps) {
  const title = record
    ? `Loan / Advance · ${record.staffName || 'Staff'}`
    : 'Loan / Advance details';

  const rows = record
    ? [
        { label: 'Employee', value: record.staffName || '—' },
        { label: 'Employee code', value: record.staffCode || '—' },
        { label: 'Loan component', value: record.componentName || '—' },
        { label: 'Loan number', value: record.loanNumber || '—' },
        { label: 'Institution', value: record.institution || '—' },
        { label: 'Department', value: record.department || '—' },
        { label: 'Roster', value: record.roster || '—' },
        { label: 'Bank', value: record.bankName || '—' },
        { label: 'Branch', value: record.branch || '—' },
        { label: 'Account number', value: record.accountNumber || '—' },
        {
          label: 'Starting balance',
          value: formatLkr(record.startingBalance)
        },
        { label: 'Loan amount', value: formatLkr(record.loanAmount) },
        {
          label: 'Monthly installment',
          value: formatLkr(record.monthlyInstallment)
        },
        { label: 'Outstanding', value: formatLkr(record.outstanding) },
        { label: 'From', value: formatDateOnly(record.fromDate) },
        { label: 'To', value: formatDateOnly(record.toDate) },
        { label: 'Status', value: record.status },
        {
          label: 'Schedule for paid',
          value: record.scheduleForPaid ? 'Yes' : 'No'
        },
        { label: 'Completed', value: record.completed ? 'Yes' : 'No' },
        {
          label: 'Completion date',
          value: formatDateOnly(record.completionDate)
        },
        { label: 'Comments', value: record.comments || '—' },
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
          <p className="text-sm text-muted-foreground">No record selected.</p>
        )}
      </div>
    </CustomDialog>
  );
}
