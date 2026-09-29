'use client';

import { Download, History, Printer, X } from 'lucide-react';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useToast
} from '@archmage/ui';
import { formatAmount } from '@/lib/utils/currency';
import {
  PAYSLIP_PAYMENT_STATUS_LABELS,
  type PayslipPaymentStatus,
  type SalaryHistoryRecord
} from '@/types/payroll';

type SheetSalaryDetailsProps = {
  open: boolean;
  record: SalaryHistoryRecord | null;
  onOpenChange: (open: boolean) => void;
  onOpenHistory?: (record: SalaryHistoryRecord) => void;
};

const LATER = 'Will be wired in the dynamic phase.';

const statusStyles: Record<PayslipPaymentStatus, string> = {
  paid: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  processed: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  pending: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  on_hold: 'bg-zinc-200 text-zinc-800 hover:bg-zinc-200'
};

function MoneyRow({
  label,
  value,
  valueClassName
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${valueClassName ?? ''}`}>
        {formatAmount(value)}
      </span>
    </div>
  );
}

export default function SheetSalaryDetails({
  open,
  record,
  onOpenChange,
  onOpenHistory
}: SheetSalaryDetailsProps) {
  const { toast } = useToast();
  const handleClose = () => onOpenChange(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>
            {record
              ? `Salary Details · ${record.salaryPeriod || 'Period'}`
              : 'Salary Details'}
          </SheetTitle>
          <SheetDescription>
            {record
              ? `${record.staffName || '—'} · ${record.staffCode || '—'}`
              : 'Period salary breakdown'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {record ? (
            <>
              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-primary">Ruhunu Hospital</p>
                    <p className="text-sm text-muted-foreground">
                      Payslip · {record.salaryPeriod || '—'}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={statusStyles[record.paymentStatus]}
                  >
                    {PAYSLIP_PAYMENT_STATUS_LABELS[record.paymentStatus]}
                  </Badge>
                </div>

                <div className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-2">
                  <div className="space-y-1">
                    <p>
                      <span className="text-muted-foreground">Staff Name: </span>
                      <span className="font-medium">
                        {record.staffName || '—'}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Department: </span>
                      {record.department || '—'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Bank A/C: </span>
                      {record.bankAccountMasked || '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>
                      <span className="text-muted-foreground">Staff Code: </span>
                      <span className="font-medium tabular-nums">
                        {record.staffCode || '—'}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Designation: </span>
                      {record.designation || '—'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">EPF No: </span>
                      {record.epfNumber || '—'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-border pt-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Earnings
                    </p>
                    <MoneyRow label="Basic Salary" value={record.basicSalary} />
                    <MoneyRow
                      label="Allowances"
                      value={record.totalAllowances}
                    />
                    <MoneyRow
                      label="Other Earnings (OT etc.)"
                      value={record.otherEarnings}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Deductions
                    </p>
                    <MoneyRow label="EPF (8%)" value={record.epfStaff} />
                    <MoneyRow label="Tax (PAYE)" value={record.paye} />
                    <MoneyRow label="Loans" value={record.loans} />
                    <MoneyRow label="Advances" value={record.advances} />
                    <MoneyRow
                      label="Other Deductions"
                      value={record.otherDeductions}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Gross Salary
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums">
                      {formatAmount(record.grossSalary)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Total Deductions
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums text-red-600">
                      {formatAmount(record.totalDeductions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">
                      Net Salary
                    </p>
                    <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-700">
                      {formatAmount(record.netSalary)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Employer contributions: EPF 12%{' '}
                  {formatAmount(record.employerEpf)} · ETF 3%{' '}
                  {formatAmount(record.employerEtf)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={() =>
                    toast({ title: 'Print', description: LATER })
                  }
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={() =>
                    toast({ title: 'Download', description: LATER })
                  }
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5"
                  onClick={() => {
                    if (onOpenHistory) {
                      onOpenHistory(record);
                      return;
                    }
                    toast({ title: 'Salary History', description: LATER });
                  }}
                >
                  <History className="h-4 w-4" />
                  Salary History
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No record selected.</p>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t border-border bg-background px-6 py-4 sm:space-x-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-red-500 transition-colors hover:bg-red-500 hover:text-white"
            onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button type="button" size="sm" className="h-9" onClick={handleClose}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
