'use client';

import { X } from 'lucide-react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@archmage/ui';
import { formatAmount } from '@/lib/utils/currency';
import {
  SALARY_HISTORY_COMPONENT_TYPE_LABELS,
  type SalaryHistoryRecord
} from '@/types/payroll';

type SheetComponentsProps = {
  open: boolean;
  record: SalaryHistoryRecord | null;
  onOpenChange: (open: boolean) => void;
};

export default function SheetComponents({
  open,
  record,
  onOpenChange
}: SheetComponentsProps) {
  const handleClose = () => onOpenChange(false);
  const lines = record?.components ?? [];

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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>
            {record
              ? `Salary Components · ${record.salaryPeriod || 'Period'}`
              : 'Salary Components'}
          </SheetTitle>
          <SheetDescription>
            {record
              ? `${record.staffName || '—'} · ${record.staffCode || '—'}`
              : 'Component breakdown for the period'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              No components for this period yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium">
                      Component
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">Type</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2.5">{line.name || '—'}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">
                        {SALARY_HISTORY_COMPONENT_TYPE_LABELS[line.type]}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatAmount(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
