'use client';

import { useState } from 'react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { LeaveApplicationRecord } from './columns';
import { LeaveApplicationViewDialog } from './view-dialog';

type LeaveApplicationStaffCodeCellProps = {
  record: LeaveApplicationRecord;
};

export function LeaveApplicationStaffCodeCell({
  record
}: LeaveApplicationStaffCodeCellProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const { has } = usePermissions();
  const canView = has('leave-application', 'view');
  const code = record.staffCode;

  if (!code) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!canView) {
    return <span className="whitespace-nowrap">{code}</span>;
  }

  return (
    <>
      <Button
        type="button"
        variant="link"
        className="h-auto whitespace-nowrap p-0 font-normal text-primary"
        onClick={() => setViewOpen(true)}
      >
        {code}
      </Button>
      <LeaveApplicationViewDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        record={record}
      />
    </>
  );
}
