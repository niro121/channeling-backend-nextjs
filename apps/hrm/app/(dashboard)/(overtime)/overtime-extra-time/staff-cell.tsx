'use client';

import { useState } from 'react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { ExtraTimeRecord } from './sample-data';
import { ExtraTimeViewDialog } from './view-dialog';

type ExtraTimeStaffCellProps = {
  record: ExtraTimeRecord;
};

export function ExtraTimeStaffCell({ record }: ExtraTimeStaffCellProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const { has } = usePermissions();
  const canView = has('overtime-requests', 'view');

  const content = (
    <div className="flex min-w-0 flex-col text-left">
      <span className="font-medium text-foreground">{record.staffName}</span>
      <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
        {record.staffCode || '—'}
      </span>
    </div>
  );

  if (!canView) {
    return content;
  }

  return (
    <>
      <Button
        type="button"
        variant="link"
        className="h-auto justify-start p-0 font-normal"
        onClick={() => setViewOpen(true)}
      >
        {content}
      </Button>
      <ExtraTimeViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        record={record}
      />
    </>
  );
}
