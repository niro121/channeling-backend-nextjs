'use client';

import { Row } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { usePermissions } from '@/components/hooks/use-permissions';
import { deleteBankAccount } from '@/app/actions/bank-account.actions';
import type { BankAccount } from '@/types/bank-account';
import { useState } from 'react';

interface BankAccountRecordActionsProps<TData extends BankAccount> {
  row: Row<TData>;
}

function BankAccountRecordActions<TData extends BankAccount>({ row }: BankAccountRecordActionsProps<TData>) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const record = row.original;

  const onDeleteConfirmation = async () => {
    if (!record.id) return;
    setLoading(true);
    try {
      const res = await deleteBankAccount(record.id);
      if (!res.success) {
        toast({ variant: 'destructive', title: 'Error', description: res.error ?? 'Failed to delete bank account' });
        return;
      }
      toast({ variant: 'success', title: 'Success', description: 'Bank account deleted successfully' });
      setShowDeleteConfirmation(false);
      router.refresh();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: e instanceof Error ? e.message : 'Delete failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        {has('bank-accounts', 'edit') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/bank-accounts/${record.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        {has('bank-accounts', 'delete') && (
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
        title="Delete bank account?"
        description="This action cannot be undone. This will permanently delete this bank account."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}

export default BankAccountRecordActions;
