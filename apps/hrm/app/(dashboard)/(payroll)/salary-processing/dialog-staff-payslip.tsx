'use client';

import { CustomDialog } from '@archmage/ui';
import { formatAmount, formatLkr } from '@/lib/utils/currency';
import type { SalaryProcessingBreakdownRow } from '@/types/payroll';

type DialogStaffPayslipProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  record: SalaryProcessingBreakdownRow | null;
};

export default function DialogStaffPayslip({
  open,
  setOpen,
  record
}: DialogStaffPayslipProps) {
  const title = record
    ? `Payslip Preview · ${record.staffName || 'Staff'}`
    : 'Payslip Preview';

  const rows = record
    ? [
        { label: 'Staff', value: record.staffName || '—' },
        { label: 'Staff code', value: record.staffCode || '—' },
        { label: 'Basic', value: formatLkr(record.basic) },
        { label: 'OT', value: formatLkr(record.ot) },
        { label: 'Allowances', value: formatLkr(record.allowances) },
        { label: 'Deductions', value: formatLkr(record.deductions) },
        { label: 'EPF (12%)', value: formatLkr(record.epf12) },
        { label: 'ETF (3%)', value: formatLkr(record.etf3) },
        { label: 'PAYE', value: formatLkr(record.paye) },
        { label: 'Net salary', value: formatLkr(record.netSalary) }
      ]
    : [];

  return (
    <CustomDialog open={open} setOpen={setOpen} title={title}>
      <div className="space-y-4 py-4">
        {record ? (
          <>
            <p className="text-sm text-muted-foreground">
              Individual staff payslip preview. Live slip layout will be wired in
              the dynamic phase.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-md border border-border bg-muted/20 px-3 py-2"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No staff record selected. Showing empty amounts:{' '}
            {formatAmount(0)}.
          </p>
        )}
      </div>
    </CustomDialog>
  );
}
