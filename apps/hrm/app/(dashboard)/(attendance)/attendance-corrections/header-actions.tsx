'use client';

import { Check, Plus, X } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import { isAttendanceCorrectionLocked } from '@/types/attendance';
import { useAttendanceCorrectionsUi } from './attendance-corrections-ui-context';

export function AttendanceCorrectionsHeaderActions() {
  const { toast } = useToast();
  const { has } = usePermissions();
  const {
    selectedRecords,
    openCreate,
    requestApproveConfirm,
    requestRejectConfirm
  } = useAttendanceCorrectionsUi();
  const canAdd = has('attendance', 'add');
  const canEdit = has('attendance', 'edit');

  if (!canAdd && !canEdit) return null;

  const ensureSelectable = (action: 'approve' | 'reject') => {
    if (selectedRecords.length < 1) {
      toast({
        title: 'Select corrections',
        description: `Select at least one row in the register, then click ${
          action === 'approve' ? 'Approve' : 'Reject'
        }.`
      });
      return false;
    }

    if (selectedRecords.some((row) => isAttendanceCorrectionLocked(row.status))) {
      toast({
        title: 'Locked corrections selected',
        description:
          'Approved, rejected, and cancelled corrections cannot be changed again. Select draft or pending rows only.'
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
          Create Correction
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
