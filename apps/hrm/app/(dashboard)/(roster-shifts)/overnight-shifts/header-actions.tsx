'use client';

import { Plus, Split } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useOvernightShiftsUi } from './overnight-shifts-ui-context';

const LATER = 'Will be wired in a later phase.';

export function OvernightShiftsHeaderActions() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openCreate } = useOvernightShiftsUi();
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
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Add Overnight Shift
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() =>
            toast({ title: 'Recalculate splits', description: LATER })
          }
        >
          <Split className="h-4 w-4" />
          Recalculate Splits
        </Button>
      ) : null}
    </div>
  );
}
