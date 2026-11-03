'use client';

import { useEffect } from 'react';
import { Button } from '@archmage/ui';
import { useCommonDataTableContext } from '@/components/common/common-data-table';
import type { BulkPaysheetStaffRow } from '@/types/payroll';
import { useBulkAssignUi } from './bulk-assign-ui-context';

type StaffSelectionToolbarProps = {
  totalMatches: number;
};

export function StaffSelectionToolbar({
  totalMatches
}: StaffSelectionToolbarProps) {
  const { table, rowSelection } = useCommonDataTableContext();
  const { setSelection, selectionClearToken } = useBulkAssignUi();

  useEffect(() => {
    const ids = table
      .getSelectedRowModel()
      .rows.map((row) => (row.original as BulkPaysheetStaffRow).id)
      .filter(Boolean);
    setSelection(ids);
  }, [rowSelection, setSelection, table]);

  useEffect(() => {
    if (selectionClearToken > 0) {
      table.resetRowSelection();
    }
  }, [selectionClearToken, table]);

  const selectedCount = Object.keys(rowSelection).filter(
    (key) => rowSelection[key]
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{selectedCount}</span>{' '}
        selected of {totalMatches}
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => table.toggleAllPageRowsSelected(true)}
        disabled={table.getRowModel().rows.length === 0}
      >
        Select all (page)
      </Button>
    </div>
  );
}
