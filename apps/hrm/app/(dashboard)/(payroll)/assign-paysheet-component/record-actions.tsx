'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { deletePaysheetAssignmentAction } from '@/app/actions/payroll-actions/paysheet-assignment.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { PaysheetAssignmentRecord } from '@/types/payroll';
import { useAssignPaysheetUi } from './assign-paysheet-ui-context';

type RecordActionsProps = {
  record: PaysheetAssignmentRecord;
};

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit, openHistory, openView } = useAssignPaysheetUi();
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
          aria-label={`View assignment for ${record.staffName}`}
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
            aria-label={`Edit assignment for ${record.staffName}`}
            onClick={() => openEdit(record)}
          >
            <Pencil className="h-4 w-4" />
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
        {canDelete ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete assignment for ${record.staffName}`}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete paysheet assignment?"
        description={`Remove ${record.componentName} for ${record.staffName} (${record.staffCode})?`}
        loading={loading}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await deletePaysheetAssignmentAction(record.id);
            setDeleteOpen(false);
            if (result.isError) {
              toast({
                title: 'Delete failed',
                description:
                  (result.errors.message as string) ??
                  'Could not delete assignment.'
              });
              return;
            }
            toast({
              title: 'Assignment deleted',
              description: `${record.componentName} · ${record.staffName}`
            });
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
