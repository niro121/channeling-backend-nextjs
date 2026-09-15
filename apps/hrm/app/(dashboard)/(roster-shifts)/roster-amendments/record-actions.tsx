'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteRosterAmendmentAction } from '@/app/actions/roster-actions/roster-amendment.actions';
import {
  isRosterAmendmentLocked,
  type RosterAmendmentRecord
} from '@/types/roster';
import { useRosterAmendmentsUi } from './roster-amendments-ui-context';

type AmendmentRecordActionsProps = {
  record: RosterAmendmentRecord;
};

export default function AmendmentRecordActions({
  record
}: AmendmentRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit, openHistory } = useRosterAmendmentsUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const locked = isRosterAmendmentLocked(record.status);
  const canEdit = has('shift-roster', 'edit') && !locked;
  const canDelete = has('shift-roster', 'delete') && !locked;

  const handleDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteRosterAmendmentAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (result.errors as { message?: string })?.message ??
            'Roster amendment could not be deleted.'
        });
        return;
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: `${record.code} deleted.`
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
            : 'Roster amendment could not be deleted.'
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
            aria-label={`Edit amendment ${record.code}`}
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
            aria-label={`Delete amendment ${record.code}`}
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
          aria-label={`History for ${record.code}`}
          onClick={() => openHistory(record)}
        >
          <Clock3 className="h-4 w-4" />
        </Button>
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete roster amendment?"
        description={`This will remove ${record.code} for ${record.staffName} (${record.staffCode}).`}
        handleContinue={() => {
          void handleDelete();
        }}
        className={{
          actionButton:
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90'
        }}
      />
    </>
  );
}
