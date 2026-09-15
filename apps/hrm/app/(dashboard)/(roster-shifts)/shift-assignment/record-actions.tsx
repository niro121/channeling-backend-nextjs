'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteShiftAssignmentAction } from '@/app/actions/roster-actions/shift-assignment.actions';
import type { ShiftAssignmentRecord } from '@/types/roster';
import { useShiftAssignmentUi } from './shift-assignment-ui-context';

type AssignmentRecordActionsProps = {
  record: ShiftAssignmentRecord;
};

export default function AssignmentRecordActions({
  record
}: AssignmentRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit, openHistory } = useShiftAssignmentUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  const handleDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteShiftAssignmentAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (result.errors as { message?: string })?.message ??
            'Shift assignment could not be deleted.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: `Assignment for ${record.staffName} deleted.`
      });
      setOpen(false);
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Shift assignment could not be deleted.'
      });
    } finally {
      setLoading(false);
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
            aria-label={`Edit assignment for ${record.staffName}`}
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
            aria-label={`Delete assignment for ${record.staffName}`}
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
        title="Delete shift assignment?"
        description={`This will remove the assignment for ${record.staffName} (${record.staffCode}).`}
        handleContinue={() => {
          void handleDelete();
        }}
        className={{ actionButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90' }}
      />
    </>
  );
}
