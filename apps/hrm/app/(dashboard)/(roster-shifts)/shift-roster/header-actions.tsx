'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Send, Sparkles } from 'lucide-react';
import {
  fillNewRosterDraftAction,
  fillOldRosterDraftAction,
  publishRosterAction
} from '@/app/actions/roster-actions/shift-roster.actions';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LoadRosterParams } from '@/types/roster';

const LATER = 'Will be wired in a later phase.';

type ShiftRosterHeaderActionsProps = {
  initialFilters: LoadRosterParams;
};

export function ShiftRosterHeaderActions({
  initialFilters
}: ShiftRosterHeaderActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canEdit = has('shift-roster', 'edit');

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

  const handleAction = async (
    action: 'fillNew' | 'fillOld' | 'publish'
  ) => {
    const result =
      action === 'fillNew'
        ? await fillNewRosterDraftAction(currentFilters)
        : action === 'fillOld'
          ? await fillOldRosterDraftAction(currentFilters)
          : await publishRosterAction(currentFilters);

    if (result.isError) {
      const errorMessage =
        'message' in result.errors
          ? (result.errors.message as string | undefined)
          : undefined;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage ?? 'Roster workflow action could not be completed.'
      });
      return;
    }

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

  if (!canEdit) return null;

  return (
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
            description: 'Allocations are saved as draft when you allocate or edit.'
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
  );
}
