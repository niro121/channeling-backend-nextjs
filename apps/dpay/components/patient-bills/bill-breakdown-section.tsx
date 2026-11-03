'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import type { BillLineItem, PatientBillFormErrors, PatientBillSummary } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { createEmptyLineItem } from '@/lib/patient-bills/form-utils';
import { BillBreakdownRow } from './bill-breakdown-row';

type BillBreakdownSectionProps = {
  lineItems: BillLineItem[];
  summary: PatientBillSummary;
  errors: PatientBillFormErrors;
  onChange: (lineItems: BillLineItem[]) => void;
};

export function BillBreakdownSection({
  lineItems,
  summary,
  errors,
  onChange,
}: BillBreakdownSectionProps) {
  const canDelete = lineItems.length > 1;

  const updateRow = (id: string, patch: Partial<BillLineItem>) => {
    onChange(lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const deleteRow = (id: string) => {
    if (!canDelete) return;
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const addRow = () => {
    onChange([...lineItems, createEmptyLineItem()]);
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between p-5 border-b">
        <div>
          <h2 className="text-base font-semibold">Bill Breakdown</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optional on admission — leave empty to save as Draft, then add doctor charges later.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Add Row
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium w-10">#</th>
              <th className="px-3 py-2.5 font-medium">Doctor</th>
              <th className="px-3 py-2.5 font-medium">Description</th>
              <th className="px-3 py-2.5 font-medium w-36">Amount (LKR)</th>
              <th className="px-3 py-2.5 font-medium w-12" />
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <BillBreakdownRow
                key={item.id}
                index={index}
                item={item}
                canDelete={canDelete}
                errors={errors.lineItems?.[item.id]}
                onChange={(patch) => updateRow(item.id, patch)}
                onDelete={() => deleteRow(item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-8 border-t px-5 py-4 text-sm">
        <div className="text-right">
          <p className="text-muted-foreground">Subtotal</p>
          <p className="font-medium tabular-nums">{formatLkr(summary.subtotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-primary tabular-nums">{formatLkr(summary.total)}</p>
        </div>
      </div>
    </div>
  );
}
