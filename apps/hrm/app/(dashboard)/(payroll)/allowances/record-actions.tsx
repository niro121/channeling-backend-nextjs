'use client';

import { useState } from 'react';
import { Ban, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { AllowanceRecord } from '@/types/payroll';
import { useAllowancesUi } from './allowances-ui-context';

type RecordActionsProps = {
  record: AllowanceRecord;
};

const LATER = 'Will be wired in the dynamic phase.';

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openEdit } = useAllowancesUi();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canEdit = has('payroll', 'edit');
  const canDelete = has('payroll', 'delete');

  const label = `${record.code || 'Allowance'} — ${record.name || 'Untitled'}`;
  const isActive = record.status === 'active';
  const toggleVerb = isActive ? 'Deactivate' : 'Activate';

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
        {canEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`${toggleVerb} ${label}`}
            onClick={() => setDeactivateOpen(true)}
          >
            <Ban className="h-4 w-4" />
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
        open={deactivateOpen}
        handleVisibilityChange={setDeactivateOpen}
        title={`${toggleVerb} allowance?`}
        description={`${toggleVerb} ${label}?`}
        loading={false}
        handleContinue={() => {
          setDeactivateOpen(false);
          toast({
            title: `${toggleVerb} allowance`,
            description: LATER
          });
        }}
      />

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete allowance?"
        description={`Remove ${label}? This cannot be undone.`}
        loading={false}
        handleContinue={() => {
          setDeleteOpen(false);
          toast({
            title: 'Delete allowance',
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
