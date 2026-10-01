'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { deleteLoanAdvanceAction } from '@/app/actions/payroll-actions/loan-advance.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LoanAdvanceRecord } from '@/types/payroll';
import { useLoansAdvancesUi } from './loans-advances-ui-context';

type RecordActionsProps = {
  record: LoanAdvanceRecord;
};

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { selectRecord, openView, clearSelection } = useLoansAdvancesUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
        loading={loading}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await deleteLoanAdvanceAction(record.id);
            setDeleteOpen(false);
            if (result.isError) {
              toast({
                variant: 'destructive',
                title: 'Delete failed',
                description:
                  (result.errors.message as string) ??
                  'Could not delete loan / advance.'
              });
              return;
            }
            toast({
              title: 'Loan / advance deleted',
              description: `${record.staffName} · ${record.loanNumber}`
            });
            clearSelection();
            router.refresh();
          } finally {
            setLoading(false);
          }
        }}
        className={{
          actionButton:
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90'
        }}
      />
    </>
  );
}
