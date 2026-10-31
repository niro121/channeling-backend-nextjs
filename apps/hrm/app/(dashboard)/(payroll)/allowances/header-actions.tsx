'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useAllowancesUi } from './allowances-ui-context';

export function AllowancesHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = useAllowancesUi();
  const canAdd = has('payroll', 'add');

  if (!canAdd) return null;

  return (
    <Button
      type="button"
      size="sm"
      className="h-9 gap-1.5"
      onClick={openCreate}
    >
      <Plus className="h-4 w-4" />
      Add Allowance
    </Button>
  );
}
