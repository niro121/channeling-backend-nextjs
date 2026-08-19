'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Split } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { recalculateOvernightSplitsAction } from '@/app/actions/roster-actions/overnight-shift.actions';
import { useOvernightShiftsUi } from './overnight-shifts-ui-context';

export function OvernightShiftsHeaderActions() {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openCreate } = useOvernightShiftsUi();
  const [recalculating, setRecalculating] = useState(false);
  const canAdd = has('shift-roster', 'add');
  const canEdit = has('shift-roster', 'edit');

  if (!canAdd && !canEdit) return null;

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const result = await recalculateOvernightSplitsAction();
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Recalculate failed',
          description: result.errors?.message ?? 'Could not recalculate splits'
        });
      } else {
        toast({
          title: 'Splits recalculated',
          description: `Updated ${result.data?.updated ?? 0} records`
        });
        router.refresh();
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong'
      });
    } finally {
      setRecalculating(false);
    }
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
          Add Overnight Shift
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          disabled={recalculating}
          onClick={handleRecalculate}
        >
          <Split className="h-4 w-4" />
          {recalculating ? 'Recalculating...' : 'Recalculate Splits'}
        </Button>
      ) : null}
    </div>
  );
}
