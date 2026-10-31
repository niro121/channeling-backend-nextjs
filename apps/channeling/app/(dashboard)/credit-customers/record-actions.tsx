'use client';

import React, { useState } from 'react';
import type { CreditCustomer } from '@/types/credit-customer';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { deleteCreditCustomer } from '@/app/actions/credit-customer.actions';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/hooks/use-permissions';

interface CreditCustomerActionsProps<TData extends CreditCustomer> {
  row: Row<TData>;
}

function CreditCustomerRecordActions<TData extends CreditCustomer>({
  row,
}: CreditCustomerActionsProps<TData>) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const creditCustomer = row.original;

  const onDeleteConfirmation = async () => {
    if (!creditCustomer.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Credit customer id not found.',
      });
      return;
    }
    try {
      setLoading(true);
      const result = await deleteCreditCustomer(creditCustomer.id);
      if (result.isError) {
        const err = result.errors as { message?: string } | undefined;
        throw new Error(err?.message ?? 'Failed to delete credit customer');
      }
      toast({
        variant: 'success',
        title: 'Success',
        description: 'Credit customer was deleted successfully',
      });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Deletion failed',
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {has('credit-customers', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/credit-customers/${creditCustomer.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('credit-customers', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>
      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDeleteConfirmation}
        loading={loading}
        title="Are you sure?"
        description="This will permanently delete this credit customer. This action cannot be undone."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}

export default CreditCustomerRecordActions;
