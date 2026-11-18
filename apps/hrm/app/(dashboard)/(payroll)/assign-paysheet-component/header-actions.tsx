'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useAssignPaysheetUi } from './assign-paysheet-ui-context';

export function AssignPaysheetHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = useAssignPaysheetUi();
  const canAdd = has('payroll', 'add');

  if (!canAdd) return null;

  return (
    <Button type="button" size="sm" className="h-9 gap-1.5" onClick={openCreate}>
      <Plus className="h-4 w-4" />
      Assign Component
    </Button>
  );
}
