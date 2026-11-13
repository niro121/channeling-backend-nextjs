'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { getShiftRosterStaffHistoryAction } from '@/app/actions/roster-actions/shift-roster.actions';
import { formatAuditDateTime } from '@/lib/utils/date';
import { buttonStyles } from '@/lib/utils/common-styles';
import type { RosterStaffRow, ShiftRosterHistoryEntry } from '@/types/roster';

type SheetRosterAllocationHistoryProps = {
  open: boolean;
  record: RosterStaffRow | null;
  dayIsos?: string[];
  onOpenChange: (open: boolean) => void;
};

export default function SheetRosterAllocationHistory({
  open,
  record,
  dayIsos = [],
  onOpenChange
}: SheetRosterAllocationHistoryProps) {
  const [entries, setEntries] = useState<ShiftRosterHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const allocationIds = useMemo(() => {
    if (!record) return [];
    const days = dayIsos.length > 0 ? dayIsos : Object.keys(record.shifts);
    return days.flatMap((d) =>
      (record.shifts[d] ?? []).map((cell) => cell.allocationId)
    );
  }, [dayIsos, record]);

  useEffect(() => {
    if (!open || !record) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void getShiftRosterStaffHistoryAction(allocationIds).then((result) => {
      if (cancelled) return;
      setEntries(result.isError ? [] : (result.data ?? []));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [allocationIds, open, record]);

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
              ? `Audit trail for ${record.staffName} (${record.staffCode}).`
              : 'Full audit trail for this record.'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading history...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {allocationIds.length === 0
                ? 'No allocations in this range yet.'
                : 'No history yet.'}
            </p>
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
            className={buttonStyles.cancel.normal}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
