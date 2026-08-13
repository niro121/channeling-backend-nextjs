'use client';

import { useState } from 'react';
import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import {
  findFirstAllocatedDay,
  type RosterStaffRowSample
} from './sample-data';
import { useShiftRosterUi } from './shift-roster-ui-context';

type RosterRecordActionsProps = {
  record: RosterStaffRowSample;
  dayIsos: string[];
};

const LATER = 'Will be wired in a later phase.';

export default function RosterRecordActions({
  record,
  dayIsos
}: RosterRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openEdit, openHistory } = useShiftRosterUi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('shift-roster', 'edit');
  const canDelete = has('shift-roster', 'delete');

  const handleEdit = () => {
    const dateIso = findFirstAllocatedDay(record, dayIsos);
    if (!dateIso) {
      toast({
        title: 'No shift allocated this week',
        description: 'Use Allocate Shift or click an empty day cell.'
      });
      return;
    }
    const shift = record.shifts[dateIso];
    if (!shift) return;
    openEdit({ row: record, dateIso, shift });
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full border border-border"
            aria-label={`Edit roster for ${record.staffName}`}
            onClick={handleEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full border border-border text-destructive hover:text-destructive"
            aria-label={`Delete roster for ${record.staffName}`}
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full border border-border"
          aria-label={`History for ${record.staffName}`}
          onClick={() => openHistory(record)}
        >
          <Clock3 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CustomAlertDialog
        open={open}
        handleVisibilityChange={setOpen}
        loading={loading}
        title="Delete allocation?"
        description={`This will remove roster allocations for ${record.staffName} (${record.staffCode}). Saving is wired in a later phase.`}
        handleContinue={() => {
          setLoading(true);
          toast({ title: 'Delete allocation', description: LATER });
          setLoading(false);
          setOpen(false);
        }}
      />
    </>
  );
}
