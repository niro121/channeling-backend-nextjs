'use client';

import React, { useState } from 'react';
import { Agency } from '@/types/agency';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { clearAgencyCreditViolationIfEligible, deleteAgency } from '@/app/actions/agency.actions';
import { Button } from '@/components/ui/button';
import { Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/hooks/use-permissions';

interface AgencyActionsProps<TData extends Agency> {
  row: Row<TData>;
}

const AgencyRecordActions = <TData extends Agency>({
  row
}: AgencyActionsProps<TData>) => {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false);
  const [showClearViolation, setShowClearViolation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearViolationLoading, setClearViolationLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();

  const agency = row.original;

  const showHideDeleteModal = (value: boolean) => {
    setShowDelConfirmation(value);
  };

  const onDeleteConfirmation = async () => {
    if (agency.id) {
      try {
        setLoading(true);
        const result = await deleteAgency(agency.id);

        if (result.isError) {
          throw new Error(result.errors?.message || 'Failed to delete agency');
        }

        toast({
          variant: 'success',
          title: 'Success',
          description: 'Agency was deleted successfully'
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message ?? 'Agency deletion unsuccessful'
        });
      } finally {
        setLoading(false);
        showHideDeleteModal(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Agency id not found.'
      });
    }
  };

  const onClearViolationConfirmation = async () => {
    if (!agency.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Agency id not found.'
      });
      return;
    }
    try {
      setClearViolationLoading(true);
      const result = await clearAgencyCreditViolationIfEligible(agency.id);
      if (!result.success || result.isError) {
        toast({
          variant: 'destructive',
          title: 'Cannot clear violation',
          description: result.errors?.message ?? 'Request failed.'
        });
        return;
      }
      if (!result.cleared) {
        toast({
          title: 'No change',
          description: result.message ?? 'Violation was not cleared.'
        });
        return;
      }
      toast({
        title: 'Violation cleared',
        description: result.message ?? 'Credit violation was cleared.'
      });
      router.refresh();
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Clear violation failed.'
      });
    } finally {
      setClearViolationLoading(false);
      setShowClearViolation(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {has('agencies', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/agencies/${agency.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('agencies', 'edit') && agency.isCreditLimitViolation && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => setShowClearViolation(true)}
            title="Clear credit violation (when eligible)"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="sr-only">Clear credit violation</span>
          </Button>
        )}
        {has('agencies', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => showHideDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>

      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={showHideDeleteModal}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this
                    agency and remove the data from our servers."
        handleContinue={onDeleteConfirmation}
      />

      <CustomAlertDialog
        open={showClearViolation}
        handleVisibilityChange={setShowClearViolation}
        loading={clearViolationLoading}
        title="Clear credit violation?"
        description="This only clears the violation if the agency's outstanding balance is already at or below the agency credit limit (same rule as after a deposit). Allowed credit limit will be reset to the agency credit limit when cleared."
        handleContinue={onClearViolationConfirmation}
      />
    </>
  );
};

export default AgencyRecordActions;
