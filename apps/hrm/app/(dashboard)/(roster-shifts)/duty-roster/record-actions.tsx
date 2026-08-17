'use client';

import { useState } from 'react';
import { ArrowLeftRight, Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { DutyRosterSample } from './sample-data';
import { useDutyRosterUi } from './duty-roster-ui-context';

type DutyRecordActionsProps = {
  record: DutyRosterSample;
};

const LATER = 'Will be wired in a later phase.';

export default function DutyRecordActions({ record }: DutyRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openEdit, openSwap, openHistory } = useDutyRosterUi();
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
        description={`This will remove ${record.staffName} (${record.staffCode}) from this duty roster. Saving is wired in a later phase.`}
        handleContinue={() => {
          setLoading(true);
          toast({ title: 'Delete duty assignment', description: LATER });
          setLoading(false);
          setOpen(false);
        }}
      />
    </>
  );
}
