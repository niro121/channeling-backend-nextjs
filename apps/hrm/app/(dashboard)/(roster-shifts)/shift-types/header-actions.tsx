'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useShiftTypesUi } from './shift-types-ui-context';

export function ShiftTypesHeaderActions() {
  const { has } = usePermissions();
  const { openAdd } = useShiftTypesUi();
  if (!has('shift-roster', 'add')) return null;

  return (
    <Button
      type="button"
      size="sm"
      className="h-9 gap-1.5"
      onClick={openAdd}
    >
      <Plus className="h-4 w-4" />
      Add Shift
    </Button>
  );
}
