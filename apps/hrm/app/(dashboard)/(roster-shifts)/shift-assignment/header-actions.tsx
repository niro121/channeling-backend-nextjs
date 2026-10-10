'use client';

import { Plus, Users } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useShiftAssignmentUi } from './shift-assignment-ui-context';

export function ShiftAssignmentHeaderActions() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openAssign, openBulk, selectedCount, selectedStaffIds } =
    useShiftAssignmentUi();
  const canAdd = has('shift-roster', 'add');
  const canEdit = has('shift-roster', 'edit');

  if (!canAdd && !canEdit) return null;

  const handleBulk = () => {
    if (selectedCount < 1) {
      toast({
        title: 'Select staff',
        description:
          'Select at least one row in the register, then click Bulk Assign.'
      });
      return;
    }
    openBulk(selectedCount, selectedStaffIds);
  };

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
          Assign Shift
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
          Bulk Assign
        </Button>
      ) : null}
    </div>
  );
}
