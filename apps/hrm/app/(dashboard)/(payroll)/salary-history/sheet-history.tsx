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
import { formatDateTime } from '@/lib/utils/date';
import type { SalaryHistoryRecord } from '@/types/payroll';

type SheetHistoryProps = {
  open: boolean;
  record: SalaryHistoryRecord | null;
  onOpenChange: (open: boolean) => void;
};

export default function SheetHistory({
  open,
  record,
  onOpenChange
}: SheetHistoryProps) {
  const handleClose = () => onOpenChange(false);
  const events = record?.history ?? [];

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
              ? `History · ${record.salaryPeriod || 'Period'}`
              : 'History'}
          </SheetTitle>
          <SheetDescription>
            {record
              ? `${record.staffName || '—'} · ${record.staffCode || '—'}`
              : 'Audit events for this salary record'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {events.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
              No history events yet.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l border-primary/40 pl-5">
              {events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.55rem] top-3 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="rounded-lg border border-border bg-card px-3 py-3">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.actor || '—'}
                      {event.at ? ` · ${formatDateTime(event.at)}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
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
