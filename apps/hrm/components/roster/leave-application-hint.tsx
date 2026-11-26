'use client';

import { useEffect, useState } from 'react';
import { getRosterLeavePreviewAction } from '@/app/actions/roster-actions/shift-roster.actions';
import type { RosterLeavePreview } from '@/types/roster';
import { cn } from '@/lib/utils';

type UseRosterLeavePreviewArgs = {
  open: boolean;
  staffId: string;
  date: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  staffLabel?: string;
};

const EMPTY_PREVIEW: RosterLeavePreview = {
  hasLeave: false,
  message: '',
  details: []
};

/** Debounced INT-L2 leave preview for duty-writing sheets. */
export function useRosterLeavePreview({
  open,
  staffId,
  date,
  startTime,
  endTime,
  staffLabel
}: UseRosterLeavePreviewArgs): RosterLeavePreview {
  const [preview, setPreview] = useState<RosterLeavePreview>(EMPTY_PREVIEW);

  useEffect(() => {
    if (!open || !staffId || !date) {
      setPreview(EMPTY_PREVIEW);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const response = await getRosterLeavePreviewAction({
          staffId,
          date,
          startTime,
          endTime,
          staffLabel
        });
        if (cancelled) return;
        if (response.isError || !response.data) {
          setPreview(EMPTY_PREVIEW);
          return;
        }
        setPreview(response.data);
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [date, endTime, open, staffId, staffLabel, startTime]);

  return preview;
}

type LeaveApplicationHintProps = {
  preview: RosterLeavePreview | null | undefined;
  className?: string;
  /** Allocate sheet — explain cell Leave flag vs Leave Application. */
  showLeaveFlagNote?: boolean;
  /** Optional action (e.g. Set Leave to Yes on Allocate). */
  action?: React.ReactNode;
};

export function LeaveApplicationHint({
  preview,
  className,
  showLeaveFlagNote = false,
  action
}: LeaveApplicationHintProps) {
  if (!preview?.hasLeave) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100',
        className
      )}
    >
      <p className="font-medium">Leave application on this date</p>
      <p className="mt-0.5 text-xs leading-relaxed opacity-90">
        {preview.details.length > 0
          ? preview.details.join('; ')
          : preview.message}
      </p>
      {showLeaveFlagNote ? (
        <p className="mt-1 text-xs opacity-80">
          Cell Leave flag is separate — set Yes only if this duty should be
          marked leave-covered. Saving may still ask you to Continue.
        </p>
      ) : (
        <p className="mt-1 text-xs opacity-80">
          Saving may still ask you to Continue (INT-L2 soft warn).
        </p>
      )}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Self-contained live leave strip for sheets that only need the hint. */
export function RosterLeaveHint(props: UseRosterLeavePreviewArgs) {
  const preview = useRosterLeavePreview(props);
  return <LeaveApplicationHint preview={preview} />;
}
