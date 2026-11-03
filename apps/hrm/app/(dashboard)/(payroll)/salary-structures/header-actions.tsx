'use client';

import { Plus } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useSalaryStructuresUi } from './salary-structures-ui-context';

export function SalaryStructuresHeaderActions() {
  const { has } = usePermissions();
  const { openCreate } = useSalaryStructuresUi();
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
      Add Structure
    </Button>
  );
}
