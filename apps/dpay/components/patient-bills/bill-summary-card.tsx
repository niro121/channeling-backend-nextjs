'use client';

import type { PatientBillSummary } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';

type BillSummaryCardProps = {
  summary: PatientBillSummary;
};

export function BillSummaryCard({ summary }: BillSummaryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm h-fit">
      <h2 className="text-base font-semibold mb-4">Bill Summary</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Line items</dt>
          <dd className="font-medium tabular-nums">{summary.lineItemCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Doctors</dt>
          <dd className="font-medium tabular-nums">{summary.doctorCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="font-medium tabular-nums">{formatLkr(summary.subtotal)}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t pt-4 flex items-center justify-between">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-xl font-bold text-primary tabular-nums">
          {formatLkr(summary.total)}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-900 leading-relaxed">
        Line items are grouped by doctor and automatically generate a separate Doctor Invoice for
        each doctor.
      </div>
    </div>
  );
}
