'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useNightShiftsUi } from './night-shifts-ui-context';

export function NightShiftsHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = useNightShiftsUi();
  if (!has('shift-roster', 'add')) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5"
        onClick={openCreate}
      >
        <Plus className="h-4 w-4" />
        Add Night Shift
      </Button>
    </div>
  );
}
