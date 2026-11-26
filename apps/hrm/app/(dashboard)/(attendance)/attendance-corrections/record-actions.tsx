'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteAttendanceCorrectionAction } from '@/app/actions/attendance-actions/attendance-correction.actions';
import {
  isAttendanceCorrectionLocked,
  type AttendanceCorrectionRecord
} from '@/types/attendance';
import { useAttendanceCorrectionsUi } from './attendance-corrections-ui-context';

type CorrectionRecordActionsProps = {
  record: AttendanceCorrectionRecord;
};

export default function CorrectionRecordActions({
  record
}: CorrectionRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit } = useAttendanceCorrectionsUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const locked = isAttendanceCorrectionLocked(record.status);
  const canEdit = has('attendance', 'edit') && !locked;
  const canDelete = has('attendance', 'delete') && !locked;

  const handleDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteAttendanceCorrectionAction(record.id);
      if (result.isError) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            (result.errors as { message?: string })?.message ??
            'Correction could not be deleted.'
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
            : 'Correction could not be deleted.'
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
            aria-label={`Edit correction ${record.code}`}
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
            aria-label={`Delete correction ${record.code}`}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete attendance correction?"
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
