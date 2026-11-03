'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { deletePerformanceAllowanceAction } from '@/app/actions/payroll-actions/performance-allowance.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { PerformanceAllowanceRecord } from '@/types/payroll';
import { usePerformanceAllowanceUi } from './performance-allowance-ui-context';

type RecordActionsProps = {
  record: PerformanceAllowanceRecord;
};

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit, openView } = usePerformanceAllowanceUi();
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
          aria-label={`View allowance for ${record.staffName}`}
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
            aria-label={`Edit allowance for ${record.staffName}`}
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
            aria-label={`Delete allowance for ${record.staffName}`}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete performance allowance?"
        description={`Remove ${
          record.mode === 'percentage' ? 'percentage' : 'fixed value'
        } allowance for ${record.staffName} (${record.staffCode})?`}
        loading={loading}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await deletePerformanceAllowanceAction(record.id);
            setDeleteOpen(false);
            if (result.isError) {
              toast({
                title: 'Delete failed',
                description:
                  (result.errors.message as string) ??
                  'Could not delete allowance.'
              });
              return;
            }
            toast({
              title: 'Allowance deleted',
              description: `${record.staffName} · ${record.staffCode}`
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
