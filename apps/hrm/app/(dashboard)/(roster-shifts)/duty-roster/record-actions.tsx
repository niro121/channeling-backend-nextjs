'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteDutyAllocationAction } from '@/app/actions/roster-actions/duty-roster.actions';
import type { DutyRosterRow } from '@/types/roster';
import { useDutyRosterUi } from './duty-roster-ui-context';

type DutyRecordActionsProps = {
  record: DutyRosterRow;
};

export default function DutyRecordActions({ record }: DutyRecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit, openSwap, openHistory } = useDutyRosterUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');
  const isLocked =
    record.status === 'published' || record.status === 'amended';

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Swap duty for ${record.staffName}`}
            onClick={() => openSwap(record)}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        ) : null}
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit duty for ${record.staffName}`}
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
            aria-label={`Delete duty for ${record.staffName}`}
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
        title="Delete duty assignment?"
        description={
          isLocked
            ? `This date is published. Use a roster amendment before removing ${record.staffName} (${record.staffCode}).`
            : `This will remove ${record.staffName} (${record.staffCode}) from this duty date.`
        }
        handleContinue={async () => {
          setLoading(true);
          const result = await deleteDutyAllocationAction(record.id);
          setLoading(false);
          if (result.isError) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description:
                (result.errors as { message?: string })?.message ??
                'Duty allocation could not be deleted.'
            });
            return;
          }
          toast({
            variant: 'success',
            title: 'Success',
            description: 'Duty allocation deleted.'
          });
          setOpen(false);
          router.refresh();
        }}
        className={{ actionButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90' }}
      />
    </>
  );
}
