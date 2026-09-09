'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@archmage/ui';
import { cn } from '@/lib/utils';
import { useCommonDataTableContext } from '../common-data-table-context';

type DataTableBulkDeleteFeatureProps = {
  label?: string;
  className?: string;
};

/**
 * Toolbar feature: opens the CommonDataTable bulk-delete confirmation.
 * Requires `haveBulkDelete` + `deleteServerAction` on CommonDataTable.
 */
export function DataTableBulkDeleteFeature({
  label = 'Bulk Delete',
  className
}: DataTableBulkDeleteFeatureProps) {
  const { rowSelection, showHideDeleteModal, fetchingDescription } =
    useCommonDataTableContext();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-9 min-w-[7rem] gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:invisible cursor-pointer',
        className
      )}
      disabled={Object.keys(rowSelection).length === 0}
      onClick={() => showHideDeleteModal(true)}
    >
      {fetchingDescription ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      <span>{label}</span>
    </Button>
  );
}
