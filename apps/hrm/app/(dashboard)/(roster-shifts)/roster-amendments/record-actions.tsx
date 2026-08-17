'use client';

import { useState } from 'react';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { isAmendmentLocked, type RosterAmendmentSample } from './sample-data';
import { useRosterAmendmentsUi } from './roster-amendments-ui-context';

type AmendmentRecordActionsProps = {
  record: RosterAmendmentSample;
};

const LATER = 'Will be wired in a later phase.';

export default function AmendmentRecordActions({
  record
}: AmendmentRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openEdit, openHistory } = useRosterAmendmentsUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const locked = isAmendmentLocked(record.status);
  const canEdit = has('shift-roster', 'edit') && !locked;
  const canDelete = has('shift-roster', 'delete') && !locked;

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit amendment ${record.amendmentNo}`}
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
            aria-label={`Delete amendment ${record.amendmentNo}`}
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
          aria-label={`History for ${record.amendmentNo}`}
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
        description={`This will remove ${record.amendmentNo} for ${record.staffName} (${record.staffCode}). Saving is wired in a later phase.`}
        handleContinue={() => {
          setLoading(true);
          toast({ title: 'Delete roster amendment', description: LATER });
          setLoading(false);
          setOpen(false);
        }}
      />
    </>
  );
}
