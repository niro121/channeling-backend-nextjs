'use client';

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
import { getSampleDutyHistory, type DutyRosterSample } from './sample-data';

type SheetDutyHistoryProps = {
  open: boolean;
  record: DutyRosterSample | null;
  onOpenChange: (open: boolean) => void;
};

export default function SheetDutyHistory({
  open,
  record,
  onOpenChange
}: SheetDutyHistoryProps) {
  const entries = record ? getSampleDutyHistory(record) : [];

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
          {entries.length === 0 ? (
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
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
