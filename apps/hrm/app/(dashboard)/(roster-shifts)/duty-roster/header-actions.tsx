'use client';

import { ArrowLeftRight, Plus, UserRoundPlus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useDutyRosterUi } from './duty-roster-ui-context';

export function DutyRosterHeaderActions() {
  const { has } = usePermissions();
  const { openAssign, openSwap, openReplace } = useDutyRosterUi();
  const canAdd = has('shift-roster', 'add');
  const canEdit = has('shift-roster', 'edit');

  if (!canAdd && !canEdit) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canAdd ? (
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          onClick={openAssign}
        >
          <Plus className="h-4 w-4" />
          Assign Staff
        </Button>
      ) : null}
      {canEdit ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => openSwap()}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Swap Shift
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => openReplace()}
          >
            <UserRoundPlus className="h-4 w-4" />
            Replace Staff
          </Button>
        </>
      ) : null}
    </div>
  );
}
