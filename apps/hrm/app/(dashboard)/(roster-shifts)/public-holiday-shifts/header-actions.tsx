'use client';

import { Plus, Users } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { usePublicHolidayShiftsUi } from './public-holiday-shifts-ui-context';

export function PublicHolidayShiftsHeaderActions() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openCreate, openBulk, selectedCount } = usePublicHolidayShiftsUi();
  const canAdd = has('shift-roster', 'add');
  const canEdit = has('shift-roster', 'edit');

  if (!canAdd && !canEdit) return null;

  const handleBulk = () => {
    if (selectedCount < 1) {
      toast({
        title: 'Select staff',
        description:
          'Select at least one row in the register, then click Bulk Assign Holiday Duty.'
      });
      return;
    }
    openBulk(selectedCount);
  };

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
          Add Holiday Shift
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          onClick={handleBulk}
        >
          <Users className="h-4 w-4" />
          Bulk Assign Holiday Duty
        </Button>
      ) : null}
    </div>
  );
}
