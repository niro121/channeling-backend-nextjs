'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO, isValid } from 'date-fns';
import { Save, Send, Sparkles } from 'lucide-react';
import {
  fillNewRosterDraftAction,
  fillOldRosterDraftAction,
  publishRosterAction
} from '@/app/actions/roster-actions/shift-roster.actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  useToast
} from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LoadRosterParams } from '@/types/roster';
import DialogSoftWarnAck from '../dialog-soft-warn-ack';

const LATER = 'Will be wired in a later phase.';

type ShiftRosterHeaderActionsProps = {
  initialFilters: LoadRosterParams;
};

type SoftAckAction = 'fillNew' | 'fillOld' | 'publish';

function formatRangeLabel(fromDate: string, toDate: string): string {
  const formatOne = (value: string) => {
    if (!value) return '—';
    const parsed = parseISO(value);
    if (!isValid(parsed)) return value;
    return format(parsed, 'dd MMM yyyy');
  };
  return `${formatOne(fromDate)} – ${formatOne(toDate)}`;
}

export function ShiftRosterHeaderActions({
  initialFilters
}: ShiftRosterHeaderActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = has('shift-roster', 'edit');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('Confirm');
  const [confirmWarnings, setConfirmWarnings] = useState<string[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [allowMarkLeaveOnApproved, setAllowMarkLeaveOnApproved] =
    useState(false);
  const [fillIntroOpen, setFillIntroOpen] = useState(false);
  const [fillIntroLoading, setFillIntroLoading] = useState(false);
  const pendingActionRef = useRef<SoftAckAction | null>(null);

  const currentFilters = {
    department: searchParams.get('department') ?? initialFilters.department,
    unit: searchParams.get('unit') ?? initialFilters.unit,
    roster: searchParams.get('roster') ?? initialFilters.roster,
    fromDate: searchParams.get('fromDate') ?? initialFilters.fromDate ?? '',
    toDate: searchParams.get('toDate') ?? initialFilters.toDate ?? ''
  };

  const rangeLabel = formatRangeLabel(
    currentFilters.fromDate,
    currentFilters.toDate
  );

  const notify = (title: string) => {
    toast({ title, description: LATER });
  };

  const runWorkflow = async (
    action: SoftAckAction,
    acknowledgedWarnings = false,
    markLeaveOnApprovedLeave = false
  ) => {
    const payload = {
      ...currentFilters,
      ...(acknowledgedWarnings ? { acknowledgedWarnings: true } : {}),
      ...(action === 'fillNew' && markLeaveOnApprovedLeave
        ? { markLeaveOnApprovedLeave: true }
        : {})
    };
    const result =
      action === 'fillNew'
        ? await fillNewRosterDraftAction(payload)
        : action === 'fillOld'
          ? await fillOldRosterDraftAction(payload)
          : await publishRosterAction(payload);

    if (result.isError) {
      const errorMap = result.errors as Record<
        string,
        string | string[] | boolean | undefined
      >;

      if (errorMap.requiresAck) {
        const softWarnings = Array.isArray(errorMap.softWarnings)
          ? errorMap.softWarnings.filter(
              (item): item is string => typeof item === 'string'
            )
          : [];
        pendingActionRef.current = action;
        setAllowMarkLeaveOnApproved(action === 'fillNew');
        setConfirmTitle(
          action === 'fillNew'
            ? 'Leave / weekly off overlaps Fill New'
            : action === 'publish'
              ? 'Leave / weekly off overlaps publish'
              : 'Leave / weekly off overlaps'
        );
        setConfirmWarnings(
          softWarnings.length
            ? softWarnings
            : [
                typeof errorMap.message === 'string'
                  ? errorMap.message
                  : 'One or more staff have leave overlapping this roster. Continue anyway?'
              ]
        );
        setConfirmOpen(true);
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          (typeof errorMap.message === 'string'
            ? errorMap.message
            : undefined) ?? 'Roster workflow action could not be completed.'
      });
      return;
    }

    pendingActionRef.current = null;
    const created =
      result.data && 'created' in result.data
        ? Number(result.data.created ?? 0)
        : 0;
    const skippedOccupied =
      result.data && 'skippedOccupied' in result.data
        ? Number(result.data.skippedOccupied ?? 0)
        : 0;

    toast({
      variant: 'success',
      title: 'Success',
      description:
        action === 'fillNew'
          ? `Created ${created} draft cell(s)${
              skippedOccupied
                ? `; skipped ${skippedOccupied} occupied day(s)`
                : ''
            }.`
          : action === 'fillOld'
            ? `Copied ${
                result.data && 'copied' in result.data ? result.data.copied : 0
              } allocation(s).`
            : 'Roster published.'
    });
    router.refresh();
  };

  if (!canEdit) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => setFillIntroOpen(true)}
        >
          Fill New
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => void runWorkflow('fillOld')}
        >
          Fill Old Roster
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => notify('Create Fixed Roster')}
        >
          <Sparkles className="h-4 w-4" />
          Create Fixed Roster
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() =>
            toast({
              title: 'Save Draft',
              description:
                'Allocations are saved as draft when you allocate or edit.'
            })
          }
        >
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => void runWorkflow('publish')}
        >
          <Send className="h-4 w-4" />
          Publish Roster
        </Button>
      </div>

      <AlertDialog
        open={fillIntroOpen}
        onOpenChange={(next) => {
          if (!fillIntroLoading) setFillIntroOpen(next);
        }}
      >
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Fill New from Auto Assign</AlertDialogTitle>
            <AlertDialogDescription>
              Creates draft duties for the loaded range{' '}
              <span className="font-semibold text-foreground">{rangeLabel}</span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What will happen
            </p>
            <ul className="list-disc space-y-2 pl-4 text-foreground">
              <li>
                Fills <span className="font-semibold">empty days only</span> —
                existing cells are left unchanged.
              </li>
              <li>
                Only staff with an{' '}
                <span className="font-semibold">active</span>,{' '}
                <span className="font-semibold">Fixed</span>,{' '}
                <span className="font-semibold">Auto Assign</span> standing
                assignment are included.
              </li>
              <li>
                <span className="font-semibold">Leave days</span> — if approved
                or pending leave overlaps a day, you will get a soft warning and
                can Continue.
              </li>
              <li>
                <span className="font-semibold">Weekly off days</span> — if a
                day matches the standing weekly off, you will get a soft warning
                and can Continue.
              </li>
            </ul>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={fillIntroLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={fillIntroLoading}
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  setFillIntroLoading(true);
                  try {
                    setFillIntroOpen(false);
                    await runWorkflow('fillNew', false);
                  } finally {
                    setFillIntroLoading(false);
                  }
                })();
              }}
            >
              {fillIntroLoading ? 'Starting…' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DialogSoftWarnAck
        open={confirmOpen}
        title={confirmTitle}
        warnings={confirmWarnings}
        loading={confirmLoading}
        allowMarkLeaveOnApproved={allowMarkLeaveOnApproved}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            pendingActionRef.current = null;
            setConfirmWarnings([]);
            setAllowMarkLeaveOnApproved(false);
          }
          setConfirmOpen(nextOpen);
        }}
        onContinue={async ({ markLeaveOnApprovedLeave }) => {
          const action = pendingActionRef.current;
          if (!action) {
            setConfirmOpen(false);
            return;
          }
          setConfirmLoading(true);
          setConfirmOpen(false);
          try {
            await runWorkflow(action, true, markLeaveOnApprovedLeave);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </>
  );
}
