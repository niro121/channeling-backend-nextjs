'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { deleteAllowanceAction } from '@/app/actions/payroll-actions/allowance.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { AllowanceRecord } from '@/types/payroll';
import { useAllowancesUi } from './allowances-ui-context';

type RecordActionsProps = {
  record: AllowanceRecord;
};

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit } = useAllowancesUi();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('payroll', 'edit');
  const canDelete = has('payroll', 'delete');

  const label = `${record.code || 'Allowance'} — ${record.name || 'Untitled'}`;

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Edit ${label}`}
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
            aria-label={`Delete ${label}`}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete allowance?"
        description={`Remove ${label} from the paysheet component catalog? This cannot be undone.`}
        loading={loading}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await deleteAllowanceAction(record.id);
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
              description: label
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
