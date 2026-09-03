'use client';

import Link from 'next/link';
import { Row } from '@tanstack/react-table';
import { Button } from '@archmage/ui';
import { Eye } from 'lucide-react';
import type { PatientBill } from '@/types/patient-bill';

type PatientBillRecordActionsProps = {
  row: Row<PatientBill>;
};

export function PatientBillRecordActions({ row }: PatientBillRecordActionsProps) {
  const bill = row.original;

  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
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
    </div>
  );
}
