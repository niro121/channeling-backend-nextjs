'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteOvernightShiftAction } from '@/app/actions/roster-actions/overnight-shift.actions';
import type { OvernightShiftRecord } from '@/types/roster';
import { useOvernightShiftsUi } from './overnight-shifts-ui-context';

type OvernightRecordActionsProps = {
  record: OvernightShiftRecord;
};

export default function OvernightRecordActions({
  record
}: OvernightRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit, openHistory } = useOvernightShiftsUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  const handleDelete = async () => {
    setLoading(true);
    try {
      const result = await deleteOvernightShiftAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: result.errors?.message ?? 'Could not delete overnight shift'
        });
      } else {
        toast({ title: 'Overnight shift deleted' });
        router.refresh();
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong'
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit overnight shift for ${record.staffName}`}
            onClick={() => openEdit(record)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete overnight shift for ${record.staffName}`}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`History for ${record.staffName}`}
          onClick={() => openHistory(record)}
        >
          <Clock3 className="h-4 w-4" />
        </Button>
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete overnight shift?"
        description={`This will remove the overnight duty for ${record.staffName} (${record.staffCode}).`}
        handleContinue={handleDelete}
      />
    </>
  );
}
