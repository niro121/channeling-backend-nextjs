'use client';

import React, { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { useToast } from '@/components/hooks/use-toast';
import { DataTableRowActions } from '@/components/common/custom-table-row-actions';
import CustomAlertDialog from '@/components/common/custom-alert-dialog';
import { bulkDeleteBulkPriceChanges } from '@/app/actions/bulk-price-change.action';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/components/hooks/use-permissions';
import { useBulkPriceChangeListContext } from './bulk-price-change-context';

export type BulkPriceChangeListRow = {
  id: string;
  name: string;
  feeTypeId: string;
  status: string;
  createdAt: Date | string;
};

type BulkPriceChangeRecordActionsProps = {
  row: Row<BulkPriceChangeListRow>;
};

export function BulkPriceChangeRecordActions({ row }: BulkPriceChangeRecordActionsProps) {
  const [showDeleteConfirmation, setShowDelConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { has } = usePermissions();
  const listContext = useBulkPriceChangeListContext();
  const record = row.original;

  const onDeleteConfirmation = async () => {
    if (!record.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'Record id not found.' });
      return;
    }
    try {
      setLoading(true);
      const success = await bulkDeleteBulkPriceChanges([record.id]);
      setShowDelConfirmation(false);
      if (success) {
        toast({ variant: 'success', title: 'Success', description: 'Bulk price change was deleted successfully.' });
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Deletion failed.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error?.message ?? 'Deletion failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DataTableRowActions>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => (listContext ? listContext.openDetail(record.id) : router.push(`/doctor-sessions/bulk-price-change?id=${record.id}`))}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
        {has('doctor-sessions', 'delete') && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDelConfirmation(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </DataTableRowActions>
      <CustomAlertDialog
        open={showDeleteConfirmation}
        handleVisibilityChange={setShowDelConfirmation}
        loading={loading}
        title="Are you absolutely sure?"
        description="This action cannot be undone. This will permanently delete this bulk price change record and its rules and report data."
        handleContinue={onDeleteConfirmation}
      />
    </>
  );
}
