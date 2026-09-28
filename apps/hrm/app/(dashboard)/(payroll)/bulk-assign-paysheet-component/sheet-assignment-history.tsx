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
import type { PaysheetAssignmentRecord } from '@/types/payroll';

type SheetAssignmentHistoryProps = {
  open: boolean;
  record: PaysheetAssignmentRecord | null;
  onOpenChange: (open: boolean) => void;
};

export default function SheetAssignmentHistory({
  open,
  record,
  onOpenChange
}: SheetAssignmentHistoryProps) {
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
              ? `Audit trail for ${record.staffName} (${record.staffCode}) · ${record.componentName}.`
              : 'Full audit trail for this assignment.'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-muted-foreground">No history yet.</p>
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end border-t border-border bg-background px-6 py-4 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
