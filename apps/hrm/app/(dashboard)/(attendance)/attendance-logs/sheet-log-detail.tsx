'use client';

import { useEffect, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import { getAttendanceLogDetailAction } from '@/app/actions/attendance-actions/attendance-log.actions';
import type {
  AttendanceLogRecord,
  AttendanceLogStatus
} from '@/types/attendance';

type SheetLogDetailProps = {
  open: boolean;
  record: AttendanceLogRecord | null;
  onOpenChange: (open: boolean) => void;
};

const LOG_STATUS_STYLES: Record<AttendanceLogStatus, string> = {
  pending: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  approved: 'bg-emerald-800 text-white hover:bg-emerald-800',
  recorded: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
  completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  rejected: 'bg-red-100 text-red-700 hover:bg-red-100'
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border py-2 last:border-0">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{value || '—'}</p>
    </div>
  );
}

export default function SheetLogDetail({
  open,
  record,
  onOpenChange
}: SheetLogDetailProps) {
  const [detail, setDetail] = useState<AttendanceLogRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !record?.id) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(record);

    void (async () => {
      const result = await getAttendanceLogDetailAction(record.id);
      if (cancelled) return;
      setLoading(false);
      if (result.isError || !result.data) {
        setError(
          (result.errors as { message?: string })?.message ??
            'Could not refresh log detail.'
        );
        return;
      }
      setDetail(result.data);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, record]);

  const row = detail ?? record;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-border bg-background px-6 py-4 pr-14 text-left">
          <SheetTitle>{row?.logCode ?? 'Log detail'}</SheetTitle>
          <SheetDescription>
            {row
              ? `${row.staffName} (${row.staffCode}) · ${row.attendanceDateLabel}`
              : 'Attendance audit entry'}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Refreshing details…
            </p>
          ) : null}
          {error ? (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          ) : null}

          {row ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'rounded-full border-0 font-medium',
                    LOG_STATUS_STYLES[row.logStatus] ??
                      LOG_STATUS_STYLES.recorded
                  )}
                >
                  {row.logStatusLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {row.sourceLabel} · {row.actionLabel}
                </span>
              </div>
              <DetailRow label="Date" value={row.eventDateLabel} />
              <DetailRow label="Time" value={row.eventTimeLabel} />
              <DetailRow label="Staff Code" value={row.staffCode} />
              <DetailRow label="Staff Name" value={row.staffName} />
              <DetailRow label="Department" value={row.department} />
              <DetailRow
                label="Attendance Date"
                value={row.attendanceDateLabel}
              />
              <DetailRow label="Action" value={row.actionLabel} />
              <DetailRow label="Previous" value={row.previousValue} />
              <DetailRow label="New Value" value={row.newValue} />
              <DetailRow label="Source" value={row.sourceLabel} />
              <DetailRow label="Performed By" value={row.performedByName} />
              <DetailRow label="Remarks" value={row.remarks} />
              <DetailRow
                label="Created"
                value={`${row.createdUser?.name ?? row.performedByName} · ${formatDateTime(row.createdAt)}`}
              />
              <DetailRow
                label="Updated"
                value={`${row.updatedUser?.name ?? row.performedByName} · ${formatDateTime(row.updatedAt)}`}
              />
            </div>
          ) : null}
        </div>

        <SheetFooter className="shrink-0 flex-row justify-end border-t border-border bg-background px-6 py-4 sm:space-x-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-24 gap-1 border-red-500 text-red-500 transition-colors ease-in-out duration-100 hover:bg-red-500 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
