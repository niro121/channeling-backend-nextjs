'use client';

import { useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LoanAdvanceRecord } from '@/types/payroll';
import { useLoansAdvancesUi } from './loans-advances-ui-context';

type RecordActionsProps = {
  record: LoanAdvanceRecord;
};

const LATER = 'Will be wired in the dynamic phase.';

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { selectRecord, openView, clearSelection } = useLoansAdvancesUi();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canEdit = has('payroll', 'edit');
  const canDelete = has('payroll', 'delete');

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`View loan for ${record.staffName}`}
          onClick={() => openView(record)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit loan for ${record.staffName}`}
            onClick={() => selectRecord(record)}
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
            aria-label={`Delete loan for ${record.staffName}`}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete loan / advance?"
        description={`Remove ${record.componentName} for ${record.staffName} (${record.loanNumber})?`}
        loading={false}
        handleContinue={() => {
          setDeleteOpen(false);
          clearSelection();
          toast({
            title: 'Delete loan / advance',
            description: LATER
          });
        }}
        className={{
          actionButton:
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90'
        }}
      />
    </>
  );
}
