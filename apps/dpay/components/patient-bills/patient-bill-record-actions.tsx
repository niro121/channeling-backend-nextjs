'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Row } from '@tanstack/react-table';
import { Button } from '@archmage/ui';
import { Ban, Eye } from 'lucide-react';
import type { PatientBill } from '@/types/patient-bill';
import { CancelPatientBillDialog } from '@/components/patient-bills/cancel-patient-bill-dialog';

type PatientBillRecordActionsProps = {
  row: Row<PatientBill>;
};

export function PatientBillRecordActions({ row }: PatientBillRecordActionsProps) {
  const bill = row.original;
  const isCancelled = bill.status === 'cancelled';
  const isClosed = bill.status === 'closed';
  const isLocked = isCancelled || isClosed;
  const [cancelOpen, setCancelOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="View bill"
        type="button"
        asChild
      >
        <Link href={`/patient-bills/${bill.id}`}>
          <Eye className="h-4 w-4" />
          <span className="sr-only">View</span>
        </Link>
      </Button>
      {!isLocked && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Cancel bill"
          type="button"
          onClick={() => setCancelOpen(true)}
        >
          <Ban className="h-3.5 w-3.5" />
          Cancel
        </Button>
      )}
      <CancelPatientBillDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        billId={bill.id}
        billNumber={bill.billNo}
      />
    </div>
  );
}
