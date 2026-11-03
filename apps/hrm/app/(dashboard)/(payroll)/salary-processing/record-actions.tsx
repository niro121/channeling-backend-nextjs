'use client';

import { Button } from '@archmage/ui';
import type { SalaryProcessingBreakdownRow } from '@/types/payroll';

type RecordActionsProps = {
  record: SalaryProcessingBreakdownRow;
  onView: (record: SalaryProcessingBreakdownRow) => void;
};

export default function RecordActions({ record, onView }: RecordActionsProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8"
      onClick={() => onView(record)}
    >
      View
    </Button>
  );
}
