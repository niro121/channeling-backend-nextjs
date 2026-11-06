'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Send, Sparkles } from 'lucide-react';
import {
  fillNewRosterDraftAction,
  fillOldRosterDraftAction,
  publishRosterAction
} from '@/app/actions/roster-actions/shift-roster.actions';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LoadRosterParams } from '@/types/roster';

const LATER = 'Will be wired in a later phase.';

type ShiftRosterHeaderActionsProps = {
  initialFilters: LoadRosterParams;
};

type SoftAckAction = 'fillOld' | 'publish';

export function ShiftRosterHeaderActions({
  initialFilters
}: ShiftRosterHeaderActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = has('shift-roster', 'edit');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDescription, setConfirmDescription] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const pendingActionRef = useRef<SoftAckAction | null>(null);
  const pendingAckRef = useRef(false);

  const currentFilters = {
    department: searchParams.get('department') ?? initialFilters.department,
    unit: searchParams.get('unit') ?? initialFilters.unit,
    roster: searchParams.get('roster') ?? initialFilters.roster,
    fromDate: searchParams.get('fromDate') ?? initialFilters.fromDate ?? '',
    toDate: searchParams.get('toDate') ?? initialFilters.toDate ?? ''
  };

  const notify = (title: string) => {
    toast({ title, description: LATER });
  };

  const runWorkflow = async (
    action: 'fillNew' | SoftAckAction,
    acknowledgedWarnings = false
  ) => {
    const payload = {
      ...currentFilters,
      ...(acknowledgedWarnings ? { acknowledgedWarnings: true } : {})
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

      if (errorMap.requiresAck && action !== 'fillNew') {
        const softWarnings = Array.isArray(errorMap.softWarnings)
          ? errorMap.softWarnings.filter(
              (item): item is string => typeof item === 'string'
            )
          : [];
        pendingActionRef.current = action;
        setConfirmDescription(
          softWarnings.join(' ') ||
            (typeof errorMap.message === 'string'
              ? errorMap.message
              : 'One or more staff have leave overlapping this roster. Continue anyway?')
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

    pendingAckRef.current = false;
    pendingActionRef.current = null;
    toast({
      variant: 'success',
      title: 'Success',
      description:
        action === 'fillNew'
          ? 'Draft roster prepared.'
          : action === 'fillOld'
            ? `Copied ${
                result.data && 'copied' in result.data ? result.data.copied : 0
              } allocation(s).`
            : 'Roster published.'
    });
    router.refresh();
  };

  const handleAction = async (action: 'fillNew' | SoftAckAction) => {
    pendingAckRef.current = false;
    await runWorkflow(action, false);
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
          onClick={() => void handleAction('fillNew')}
        >
          Fill New
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => void handleAction('fillOld')}
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
          onClick={() => void handleAction('publish')}
        >
          <Send className="h-4 w-4" />
          Publish Roster
        </Button>
      </div>

      <CustomAlertDialog
        open={confirmOpen}
        title="Staff leave overlaps roster"
        description={confirmDescription}
        loading={confirmLoading}
        handleVisibilityChange={(nextOpen) => {
          if (!nextOpen) {
            pendingActionRef.current = null;
            pendingAckRef.current = false;
          }
          setConfirmOpen(nextOpen);
        }}
        handleContinue={async () => {
          const action = pendingActionRef.current;
          if (!action) {
            setConfirmOpen(false);
            return;
          }
          setConfirmLoading(true);
          pendingAckRef.current = true;
          setConfirmOpen(false);
          try {
            await runWorkflow(action, true);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </>
  );
}
