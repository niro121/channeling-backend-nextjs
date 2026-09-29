'use client';

import { useState } from 'react';
import { Ban, Copy, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { SalaryStructureRecord } from '@/types/payroll';
import { useSalaryStructuresUi } from './salary-structures-ui-context';

type RecordActionsProps = {
  record: SalaryStructureRecord;
};

const LATER = 'Will be wired in the dynamic phase.';

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openEdit } = useSalaryStructuresUi();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canEdit = has('payroll', 'edit');
  const canDelete = has('payroll', 'delete');
  const canAdd = has('payroll', 'add');

  const label = `${record.code || 'Structure'} — ${record.name || 'Untitled'}`;
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
        {canAdd ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`Duplicate ${label}`}
            onClick={() => setDuplicateOpen(true)}
          >
            <Copy className="h-4 w-4" />
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
        open={duplicateOpen}
        handleVisibilityChange={setDuplicateOpen}
        title="Duplicate salary structure?"
        description={`Create a copy of ${label}?`}
        loading={false}
        handleContinue={() => {
          setDuplicateOpen(false);
          toast({
            title: 'Duplicate structure',
            description: LATER
          });
        }}
      />

      <CustomAlertDialog
        open={deactivateOpen}
        handleVisibilityChange={setDeactivateOpen}
        title={`${toggleVerb} salary structure?`}
        description={`${toggleVerb} ${label}?`}
        loading={false}
        handleContinue={() => {
          setDeactivateOpen(false);
          toast({
            title: `${toggleVerb} structure`,
            description: LATER
          });
        }}
      />

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete salary structure?"
        description={`Remove ${label}? This cannot be undone.`}
        loading={false}
        handleContinue={() => {
          setDeleteOpen(false);
          toast({
            title: 'Delete structure',
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
