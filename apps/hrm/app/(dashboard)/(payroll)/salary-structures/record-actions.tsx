'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Copy, Pencil, Trash2 } from 'lucide-react';
import { Button, CustomAlertDialog, useToast } from '@archmage/ui';
import {
  deleteSalaryStructureAction,
  duplicateSalaryStructureAction,
  setSalaryStructureStatusAction
} from '@/app/actions/payroll-actions/salary-structure.actions';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { SalaryStructureRecord } from '@/types/payroll';
import { useSalaryStructuresUi } from './salary-structures-ui-context';

type RecordActionsProps = {
  record: SalaryStructureRecord;
};

export default function RecordActions({ record }: RecordActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const { openEdit } = useSalaryStructuresUi();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const canEdit = has('payroll', 'edit');
  const canDelete = has('payroll', 'delete');
  const canAdd = has('payroll', 'add');

  const label = `${record.code || 'Structure'} — ${record.name || 'Untitled'}`;
  const isActive = record.status === 'active';
  const toggleVerb = isActive ? 'Deactivate' : 'Activate';
  const nextStatus = isActive ? 'inactive' : 'active';

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
        loading={loading}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await duplicateSalaryStructureAction(record.id);
            setDuplicateOpen(false);
            if (result.isError || !result.data) {
              toast({
                title: 'Duplicate failed',
                description:
                  (result.errors.message as string) ??
                  'Could not duplicate structure.'
              });
              return;
            }
            toast({
              title: 'Structure duplicated',
              description: `${result.data.code} — ${result.data.name}`
            });
            router.refresh();
          } finally {
            setLoading(false);
          }
        }}
      />

      <CustomAlertDialog
        open={deactivateOpen}
        handleVisibilityChange={setDeactivateOpen}
        title={`${toggleVerb} salary structure?`}
        description={`${toggleVerb} ${label}?`}
        loading={loading}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await setSalaryStructureStatusAction(
              record.id,
              nextStatus
            );
            setDeactivateOpen(false);
            if (result.isError || !result.data) {
              toast({
                title: `${toggleVerb} failed`,
                description:
                  (result.errors.message as string) ??
                  'Could not update status.'
              });
              return;
            }
            toast({
              title: `Structure ${nextStatus}`,
              description: label
            });
            router.refresh();
          } finally {
            setLoading(false);
          }
        }}
      />

      <CustomAlertDialog
        open={deleteOpen}
        handleVisibilityChange={setDeleteOpen}
        title="Delete salary structure?"
        description={`Remove ${label}? This cannot be undone.`}
        loading={loading}
        handleContinue={async () => {
          setLoading(true);
          try {
            const result = await deleteSalaryStructureAction(record.id);
            setDeleteOpen(false);
            if (result.isError) {
              toast({
                title: 'Delete failed',
                description:
                  (result.errors.message as string) ??
                  'Could not delete structure.'
              });
              return;
            }
            toast({
              title: 'Structure deleted',
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
