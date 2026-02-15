'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { BulkPriceChangeDetail } from './bulk-price-change-detail';

type BulkPriceChangeDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkId: string | null;
  onClose?: () => void;
};

export function BulkPriceChangeDetailDialog({
  open,
  onOpenChange,
  bulkId,
  onClose
}: BulkPriceChangeDetailDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="sr-only">
            {bulkId ? 'Bulk price change' : 'Loading…'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {bulkId && (
            <BulkPriceChangeDetail
              bulkId={bulkId}
              onClose={handleClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
