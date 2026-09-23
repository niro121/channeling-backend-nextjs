'use client';

import { CustomDialog } from '@archmage/ui';
import { formatAmount, formatLkr, formatLkrCompact } from '@/lib/utils/currency';
import type { SalaryProcessingSummary } from '@/types/payroll';

type DialogCyclePayslipProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  summary: SalaryProcessingSummary;
};

export default function DialogCyclePayslip({
  open,
  setOpen,
  summary
}: DialogCyclePayslipProps) {
  const rows = [
    { label: 'Period', value: summary.periodLabel ?? '—' },
    { label: 'Staff count', value: formatAmount(summary.staffCount) },
    { label: 'Initiated by', value: summary.initiatedBy ?? '—' },
    { label: 'Gross salary', value: formatLkrCompact(summary.grossSalary) },
    {
      label: 'Total deductions',
      value: formatLkrCompact(summary.totalDeductions)
    },
    { label: 'Net payable', value: formatLkrCompact(summary.netPayable) },
    { label: 'EPF + ETF', value: formatLkrCompact(summary.epfEtf) }
  ];

  return (
    <CustomDialog open={open} setOpen={setOpen} title="Payslip Preview">
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Cycle-level payslip summary for all staff in this processing run.
          Detailed content will be wired in the dynamic phase.
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
        <p className="text-xs text-muted-foreground">
          Totals shown as {formatLkr(0)} until live payroll data is available.
        </p>
      </div>
    </CustomDialog>
  );
}
