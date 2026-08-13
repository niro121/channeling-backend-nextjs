'use client';

import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { RosterStaffRowSample } from './sample-data';

type RosterRecordActionsProps = {
  record: RosterStaffRowSample;
};

const LATER = 'Will be wired in a later phase.';

export default function RosterRecordActions({
  record
}: RosterRecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const canEdit = has('shift-roster', 'edit');

  if (!canEdit) return null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full border border-border"
        aria-label={`Edit roster for ${record.staffName}`}
        onClick={() =>
          toast({ title: 'Edit allocation', description: LATER })
        }
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full border border-border text-destructive hover:text-destructive"
        aria-label={`Delete roster for ${record.staffName}`}
        onClick={() =>
          toast({ title: 'Delete allocation', description: LATER })
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-full border border-border"
        aria-label={`History for ${record.staffName}`}
        onClick={() =>
          toast({ title: 'Allocation history', description: LATER })
        }
      >
        <Clock3 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
