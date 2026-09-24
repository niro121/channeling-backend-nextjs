'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@archmage/ui';
import { formatAuditDateTime } from '@/lib/utils/date';
import { getShiftTypeHistoryAction } from '@/app/actions/roster-actions/shift-type.actions';
import type {
  ShiftTypeHistoryEntry,
  ShiftTypeRecord
} from '@/types/roster';

type SheetShiftTypeHistoryProps = {
  open: boolean;
  record: ShiftTypeRecord | null;
  onOpenChange: (open: boolean) => void;
};

export default function SheetShiftTypeHistory({
  open,
  record,
  onOpenChange
}: SheetShiftTypeHistoryProps) {
  const [entries, setEntries] = useState<ShiftTypeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !record?.id) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getShiftTypeHistoryAction(record.id).then((result) => {
      if (cancelled) return;
      setEntries(result.isError ? [] : (result.data ?? []));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, record?.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>Change History</SheetTitle>
          <SheetDescription>
            {record
              ? `Audit trail for ${record.name} (${record.code}).`
              : 'Audit trail for this shift type.'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading history...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-5">
              {entries.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-background" />
                  <p className="text-sm font-medium text-foreground">
                    {entry.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {entry.detail}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.userLabel} · {formatAuditDateTime(entry.at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end border-t border-border bg-background px-6 py-4 sm:space-x-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
