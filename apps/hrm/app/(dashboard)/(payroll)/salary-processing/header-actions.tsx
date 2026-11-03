'use client';

import { ChevronRight, FileText, PauseCircle } from 'lucide-react';
import { Button } from '@archmage/ui';

type SalaryProcessingHeaderActionsProps = {
  busy?: boolean;
  canHold?: boolean;
  onPayslipPreview: () => void;
  onHold: () => void;
  onContinue: () => void;
  continueLabel: string;
};

export function SalaryProcessingHeaderActions({
  busy = false,
  canHold = false,
  onPayslipPreview,
  onHold,
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
        disabled={busy}
        onClick={onPayslipPreview}
      >
        <FileText className="h-4 w-4" />
        Payslip Preview
      </Button>
      {canHold ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          disabled={busy}
          onClick={onHold}
        >
          <PauseCircle className="h-4 w-4" />
          Hold
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5"
        disabled={busy}
        onClick={onContinue}
      >
        {busy ? 'Working…' : continueLabel}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
