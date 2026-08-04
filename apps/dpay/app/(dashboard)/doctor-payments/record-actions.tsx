'use client';

import { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { Button } from '@archmage/ui';
import { Ban, Eye } from 'lucide-react';
import type { DoctorPaymentListItem } from '@/types/doctor-payment';
import { CancelDoctorPaymentDialog } from '@/components/doctor-payments/cancel-doctor-payment-dialog';
import { useDoctorPaymentsView } from './doctor-payments-view-context';

type DoctorPaymentRecordActionsProps = {
  row: Row<DoctorPaymentListItem>;
};

export function DoctorPaymentRecordActions({ row }: DoctorPaymentRecordActionsProps) {
  const openView = useDoctorPaymentsView()?.openView;
  const canCancel = row.original.status === 'paid';
  const [cancelOpen, setCancelOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="View payment"
        type="button"
        onClick={() => openView?.(row.original)}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">View</span>
      </Button>
      {canCancel ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Cancel payment"
          type="button"
          onClick={() => setCancelOpen(true)}
        >
          <Ban className="h-3.5 w-3.5" />
          Cancel
        </Button>
      ) : null}
      <CancelDoctorPaymentDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        paymentId={row.original.id}
        receiptNumber={row.original.receiptNo}
        originalPaymentMethod={row.original.method}
      />
    </div>
  );
}
