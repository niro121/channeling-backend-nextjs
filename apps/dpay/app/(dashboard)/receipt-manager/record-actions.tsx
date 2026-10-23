'use client';

import { Button } from '@archmage/ui';
import { Eye } from 'lucide-react';
import { useReceiptManagerView } from './receipt-manager-view-context';

type ReceiptManagerRecordActionsProps = {
  receiptId: string;
};

export function ReceiptManagerRecordActions({ receiptId }: ReceiptManagerRecordActionsProps) {
  const openView = useReceiptManagerView()?.openView;

  return (
    <div className="flex items-center justify-end">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="View receipt and journal"
        onClick={() => openView?.(receiptId)}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">View</span>
      </Button>
    </div>
  );
}
