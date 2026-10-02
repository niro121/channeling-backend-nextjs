'use client';

import { Check, Plus, X } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { isRosterAmendmentLocked } from '@/types/roster';
import { useRosterAmendmentsUi } from './roster-amendments-ui-context';

export function RosterAmendmentsHeaderActions() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const {
    selectedRecords,
    openCreate,
    requestApproveConfirm,
    requestRejectConfirm
  } = useRosterAmendmentsUi();
  const canAdd = has('shift-roster', 'add');
  const canEdit = has('shift-roster', 'edit');

  if (!canAdd && !canEdit) return null;

  const ensureSelectable = (action: 'approve' | 'reject') => {
    if (selectedRecords.length < 1) {
      toast({
        title: 'Select amendments',
        description: `Select at least one row in the register, then click ${
          action === 'approve' ? 'Approve' : 'Reject'
        }.`
      });
      return false;
    }

    if (selectedRecords.some((row) => isRosterAmendmentLocked(row.status))) {
      toast({
        title: 'Locked amendments selected',
        description:
          'Approved and rejected amendments cannot be approved or rejected again. Select draft or pending rows only.'
      });
      return false;
    }

    return true;
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canAdd ? (
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          New Amendment
        </Button>
      ) : null}
      {canEdit ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => {
              if (!ensureSelectable('approve')) return;
              requestApproveConfirm();
            }}
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              if (!ensureSelectable('reject')) return;
              requestRejectConfirm();
            }}
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </>
      ) : null}
    </div>
  );
}
