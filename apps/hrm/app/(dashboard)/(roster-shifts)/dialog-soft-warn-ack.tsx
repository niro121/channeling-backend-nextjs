'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Label,
  Switch
} from '@archmage/ui';

const MAX_VISIBLE = 8;

type DialogSoftWarnAckProps = {
  open: boolean;
  title?: string;
  warnings: string[];
  loading?: boolean;
  /** Show switch to mark Leave on duties overlapping approved leave. */
  allowMarkLeaveOnApproved?: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: (options: {
    markLeaveOnApprovedLeave: boolean;
  }) => void | Promise<void>;
};

function cleanWarning(text: string): string {
  return text
    .replace(/\s*Continue allocating anyway\??\s*$/i, '')
    .replace(/\s*Continue anyway\??\s*$/i, '')
    .trim();
}

function classifyWarnings(warnings: string[]): {
  leave: string[];
  weeklyOff: string[];
  other: string[];
} {
  const leave: string[] = [];
  const weeklyOff: string[] = [];
  const other: string[] = [];

  for (const raw of warnings) {
    const text = cleanWarning(raw);
    if (!text) continue;
    const lower = text.toLowerCase();
    if (lower.includes('weekly off')) weeklyOff.push(text);
    else if (lower.includes('has leave') || lower.includes('leave covering'))
      leave.push(text);
    else other.push(text);
  }

  return { leave, weeklyOff, other };
}

/** Bold the staff label before “ has …”. */
function WarningLine({ text }: { text: string }) {
  const match = text.match(/^(.*?)\s+(has\s.+)$/i);
  if (!match) {
    return <span>{text}</span>;
  }
  return (
    <span>
      <span className="font-semibold text-foreground">{match[1]}</span>{' '}
      {match[2]}
    </span>
  );
}

function WarningGroup({
  label,
  items
}: {
  label: string;
  items: string[];
}) {
  if (!items.length) return null;
  const visible = items.slice(0, MAX_VISIBLE);
  const remaining = items.length - visible.length;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        <span className="ml-1 font-normal normal-case text-muted-foreground">
          ({items.length})
        </span>
      </p>
      <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground">
        {visible.map((item, index) => (
          <li key={`${label}-${index}`}>
            <WarningLine text={item} />
          </li>
        ))}
      </ul>
      {remaining > 0 ? (
        <p className="pl-4 text-xs text-muted-foreground">
          and {remaining} more…
        </p>
      ) : null}
    </div>
  );
}

/**
 * Soft-ack Continue dialog for leave / weekly-off overlaps (Fill New,
 * Auto Assign All, publish-style flows). Uses AlertDialog primitives so
 * warnings can be listed and highlighted.
 */
export default function DialogSoftWarnAck({
  open,
  title = 'Leave / weekly off overlaps',
  warnings,
  loading = false,
  allowMarkLeaveOnApproved = false,
  onOpenChange,
  onContinue
}: DialogSoftWarnAckProps) {
  const [markLeaveOnApprovedLeave, setMarkLeaveOnApprovedLeave] =
    useState(false);

  useEffect(() => {
    if (open) setMarkLeaveOnApprovedLeave(false);
  }, [open]);

  const unique = [...new Set(warnings.map(cleanWarning).filter(Boolean))];
  const { leave, weeklyOff, other } = classifyWarnings(unique);
  const total = leave.length + weeklyOff.length + other.length;
  const showMarkLeave =
    allowMarkLeaveOnApproved && leave.length > 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {total > 0 ? (
              <>
                Found{' '}
                <span className="font-semibold text-foreground">{total}</span>{' '}
                overlap
                {total === 1 ? '' : 's'} with{' '}
                <span className="font-semibold text-foreground">leave</span> or{' '}
                <span className="font-semibold text-foreground">
                  weekly off
                </span>
                . Continue to create drafts anyway?
              </>
            ) : (
              'One or more staff have leave or weekly off overlapping this roster. Continue anyway?'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {total > 0 ? (
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-3">
            <WarningGroup label="Weekly off days" items={weeklyOff} />
            <WarningGroup label="Leave days" items={leave} />
            <WarningGroup label="Other" items={other} />
          </div>
        ) : null}

        {showMarkLeave ? (
          <div className="flex items-start justify-between gap-4 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-3">
            <div className="min-w-0 space-y-0.5">
              <Label
                htmlFor="mark-leave-approved"
                className="cursor-pointer text-sm font-semibold text-amber-950"
              >
                Mark Leave on approved leave days
              </Label>
              <p className="text-xs text-amber-900/80">
                When on, new draft cells that overlap{' '}
                <span className="font-medium">approved</span> leave are created
                with the Leave flag set (amber chip). Pending leave is
                unchanged.
              </p>
            </div>
            <Switch
              id="mark-leave-approved"
              checked={markLeaveOnApprovedLeave}
              onCheckedChange={setMarkLeaveOnApprovedLeave}
              disabled={loading}
              className="shrink-0"
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(event) => {
              event.preventDefault();
              void onContinue({
                markLeaveOnApprovedLeave: showMarkLeave
                  ? markLeaveOnApprovedLeave
                  : false
              });
            }}
          >
            {loading ? 'Continuing…' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
