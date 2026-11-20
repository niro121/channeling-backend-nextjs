'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Info } from 'lucide-react';
import { getLieuGrantPreviewAction } from '@/app/actions/roster-actions/public-holiday-shift.actions';
import { LIEU_GRANT_DAYS, type LieuGrantPreview } from '@/types/leave';

type LieuGrantPreviewCardProps = {
  enabled: boolean;
  staffId: string;
  dutyDate: Date | null;
  allocationId?: string | null;
  /** Bulk assign: no single-staff balance; show period only. */
  bulkStaffCount?: number;
};

function Stat({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export function LieuGrantPreviewCard({
  enabled,
  staffId,
  dutyDate,
  allocationId,
  bulkStaffCount
}: LieuGrantPreviewCardProps) {
  const [preview, setPreview] = useState<LieuGrantPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const isBulk = (bulkStaffCount ?? 0) > 0;

  useEffect(() => {
    if (!enabled || !dutyDate) {
      setPreview(null);
      setLoading(false);
      return;
    }

    if (isBulk) {
      setPreview(null);
      setLoading(false);
      return;
    }

    if (!staffId.trim()) {
      setPreview(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await getLieuGrantPreviewAction({
          staffId,
          dutyDate,
          allocationId
        });
        if (cancelled) return;
        setPreview(result.isError ? null : (result.data ?? null));
        setLoading(false);
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    enabled,
    staffId,
    dutyDate?.getTime(),
    allocationId,
    isBulk
  ]);

  if (!enabled) return null;

  if (isBulk && dutyDate) {
    const year = format(dutyDate, 'yyyy');
    return (
      <div className="space-y-2 rounded-lg border border-sky-200/80 bg-sky-50/60 px-3 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/20">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-foreground">Lieu grant preview</p>
            <p className="text-xs text-muted-foreground">
              Each of the {bulkStaffCount} selected staff will receive{' '}
              <strong>+{LIEU_GRANT_DAYS}</strong> Lieu day
              {LIEU_GRANT_DAYS === 1 ? '' : 's'} for{' '}
              <strong>
                1 Jan {year} – 31 Dec {year}
              </strong>{' '}
              when status is Approved / published / amended. This is leave
              credit, not pay.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!staffId.trim() || !dutyDate) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        Select staff and holiday date to preview the Lieu credit period and
        balance.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        Loading Lieu balance…
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
        Could not load Lieu grant preview.
      </div>
    );
  }

  return (
    <div className="space-y-2.5 rounded-lg border border-sky-200/80 bg-sky-50/60 px-3 py-3 dark:border-sky-900/50 dark:bg-sky-950/20">
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-400" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            Lieu grant preview
          </p>
          <p className="text-xs text-muted-foreground">
            Credit period:{' '}
            <span className="font-medium text-foreground">
              {preview.periodLabel}
            </span>
            {preview.leaveTypeCode
              ? ` · ${preview.leaveTypeCode} — ${preview.leaveTypeName}`
              : null}
          </p>
        </div>
      </div>

      {!preview.hasPublishedLieuType ? (
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {preview.message}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Earned (year)" value={preview.daysEarnedThisYear} />
            <Stat label="Used" value={preview.used} />
            <Stat label="Remaining" value={preview.remaining} />
            <Stat
              label={`After +${LIEU_GRANT_DAYS}`}
              value={
                preview.alreadyGrantedForAllocation
                  ? preview.remaining
                  : preview.afterGrantRemaining
              }
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Posts when status is Approved / published / amended. Grant Lieu is
            leave credit only — not payroll.
            {preview.message ? ` ${preview.message}` : ''}
          </p>
        </>
      )}
    </div>
  );
}
