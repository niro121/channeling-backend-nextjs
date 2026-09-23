'use client';

import { ChevronRight, FileText } from 'lucide-react';
import { Button } from '@archmage/ui';

type SalaryProcessingHeaderActionsProps = {
  onPayslipPreview: () => void;
  onContinue: () => void;
  continueLabel: string;
};

export function SalaryProcessingHeaderActions({
  onPayslipPreview,
  onContinue,
  continueLabel
}: SalaryProcessingHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 gap-1.5"
        onClick={onPayslipPreview}
      >
        <FileText className="h-4 w-4" />
        Payslip Preview
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5"
        onClick={onContinue}
      >
        {continueLabel}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
