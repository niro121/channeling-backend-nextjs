'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import { Button, CustomDialog } from '@archmage/ui';

/** Header actions for leave management: Filter dialog + Apply Leave. */
export function LeaveManagementHeaderActions() {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={() => setFilterOpen(true)}
      >
        <Filter className="h-4 w-4" />
        Filter
      </Button>
      <Button type="button" size="sm" className="h-9 gap-1.5" asChild>
        <Link href="/leave-application">
          <Plus className="h-4 w-4" />
          Apply Leave
        </Link>
      </Button>

      <CustomDialog
        open={filterOpen}
        setOpen={setFilterOpen}
        title="Filter Leave Management"
      >
        <div className="space-y-4 py-4">
          <div className="min-h-24 rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Filters will be added in a later pass (department / leave type /
            status).
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFilterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setFilterOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </CustomDialog>
    </>
  );
}
