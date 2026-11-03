'use client';

import { useState } from 'react';
import { Row } from '@tanstack/react-table';
import { Button } from '@archmage/ui';
import { Eye } from 'lucide-react';
import type { DoctorPaymentListItem } from '@/types/doctor-payment';
import { CancelDoctorPaymentDialog } from '@/components/doctor-payments/cancel-doctor-payment-dialog';
import { CancelActionButton } from '@/components/ui/cancel-action-button';
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
        <CancelActionButton
          title="Cancel payment"
          onClick={() => setCancelOpen(true)}
        />
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
