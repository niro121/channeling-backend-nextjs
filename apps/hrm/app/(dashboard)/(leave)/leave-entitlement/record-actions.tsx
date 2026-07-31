'use client';

import { Row } from '@tanstack/react-table';
import { Button, DataTableRowActions } from '@archmage/ui';
import { Pencil, Trash2 } from 'lucide-react';
import type { LeaveEntitlementRecord } from './columns';

interface LeaveEntitlementRecordActionsProps {
  row: Row<LeaveEntitlementRecord>;
}

/** Placeholder row actions — wire edit/delete flows later. */
export default function LeaveEntitlementRecordActions({
  row
}: LeaveEntitlementRecordActionsProps) {
  const record = row.original;

  return (
    <div className="flex justify-end">
      <DataTableRowActions>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 cursor-pointer"
          onClick={() => {
            // TODO: edit entitlement
            console.log('edit entitlement', record.id);
          }}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer"
          onClick={() => {
            // TODO: delete entitlement
            console.log('delete entitlement', record.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </DataTableRowActions>
    </div>
  );
}
