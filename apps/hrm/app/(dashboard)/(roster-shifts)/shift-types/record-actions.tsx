'use client';

import { useState } from 'react';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { ShiftTypeSample } from './sample-data';
import { useShiftTypesUi } from './shift-types-ui-context';

type ShiftTypeRecordActionsProps = {
  record: ShiftTypeSample;
};

const LATER = 'Will be wired in a later phase.';

export default function ShiftTypeRecordActions({
  record
}: ShiftTypeRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openEdit, openHistory } = useShiftTypesUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${record.name}`}
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
            aria-label={`Delete ${record.name}`}
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
          aria-label={`History for ${record.name}`}
          onClick={() => openHistory(record)}
        >
          <Clock3 className="h-4 w-4" />
        </Button>
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete shift type?"
        description={`This will remove ${record.name} (${record.code}). Saving is wired in a later phase.`}
        handleContinue={() => {
          setLoading(true);
          toast({ title: 'Delete shift type', description: LATER });
          setLoading(false);
          setOpen(false);
        }}
      />
    </>
  );
}
