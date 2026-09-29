'use client';

import { X } from 'lucide-react';
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@archmage/ui';
import { formatAmount, formatLkr } from '@/lib/utils/currency';
import { formatDateTime } from '@/lib/utils/date';
import {
  BANK_TRANSFER_BATCH_STATUS_LABELS,
  type BankTransferBatchRecord,
  type BankTransferBatchStatus
} from '@/types/payroll';

type SheetBatchViewProps = {
  open: boolean;
  record: BankTransferBatchRecord | null;
  onOpenChange: (open: boolean) => void;
};

const statusStyles: Record<BankTransferBatchStatus, string> = {
  pending: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  generated: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  processed: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function SheetBatchView({
  open,
  record,
  onOpenChange
}: SheetBatchViewProps) {
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
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>
            {record ? `Batch ${record.batchCode}` : 'Batch'}
          </SheetTitle>
          <SheetDescription>
            Bank transfer batch summary and audit trail.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {record ? (
            <>
              <div className="rounded-lg border border-border bg-card px-4 py-1">
                <DetailRow
                  label="Salary Period"
                  value={record.salaryPeriod || '—'}
                />
                <DetailRow label="Bank" value={record.bankName || '—'} />
                <DetailRow
                  label="Number of Staff"
                  value={formatAmount(record.staffCount)}
                />
                <DetailRow
                  label="Total Transfer Amount"
                  value={formatLkr(record.totalNetSalary)}
                />
                <DetailRow
                  label="File Format"
                  value="Existing bank upload format (unchanged)"
                />
                <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant="secondary"
                    className={statusStyles[record.status]}
                  >
                    {BANK_TRANSFER_BATCH_STATUS_LABELS[record.status]}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  Created by:{' '}
                  <span className="text-foreground">
                    {record.createdBy
                      ? `${record.createdBy}${
                          record.createdAt
                            ? ` — ${formatDateTime(record.createdAt)}`
                            : ''
                        }`
                      : '—'}
                  </span>
                </p>
                <p>
                  Last updated:{' '}
                  <span className="text-foreground">
                    {record.updatedBy
                      ? `${record.updatedBy}${
                          record.updatedAt
                            ? ` — ${formatDateTime(record.updatedAt)}`
                            : ''
                        }`
                      : '—'}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No batch selected.</p>
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
