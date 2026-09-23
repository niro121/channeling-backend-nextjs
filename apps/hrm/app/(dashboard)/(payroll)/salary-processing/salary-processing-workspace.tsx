'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { formatAmount } from '@/lib/utils/currency';
import {
  EMPTY_SALARY_PROCESSING_SUMMARY,
  SALARY_PROCESSING_WIZARD_STEPS,
  type SalaryProcessingBreakdownRow,
  type SalaryProcessingWizardStep
} from '@/types/payroll';
import DialogCyclePayslip from './dialog-cycle-payslip';
import DialogStaffPayslip from './dialog-staff-payslip';
import { SalaryProcessingHeaderActions } from './header-actions';
import SectionProcessingSummary from './section-processing-summary';
import SectionSalaryBreakdown from './section-salary-breakdown';
import SectionWizard from './section-wizard';

const LATER = 'Will be wired in the dynamic phase.';

export default function SalaryProcessingWorkspace() {
  const { toast } = useToast();
  const [records] = useState<SalaryProcessingBreakdownRow[]>([]);
  const [cyclePayslipOpen, setCyclePayslipOpen] = useState(false);
  const [staffPayslipOpen, setStaffPayslipOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<SalaryProcessingBreakdownRow | null>(null);

  const summary = EMPTY_SALARY_PROCESSING_SUMMARY;
  const currentStep = useMemo(
    () =>
      SALARY_PROCESSING_WIZARD_STEPS.find((step) => step.status === 'current') ??
      SALARY_PROCESSING_WIZARD_STEPS[4],
    []
  );

  const contextDescription = [
    summary.periodLabel ?? '—',
    `${formatAmount(summary.staffCount)} staff`,
    `Initiated by ${summary.initiatedBy ?? '—'}`
  ].join(' · ');

  const continueLabel = currentStep
    ? `Continue to Step ${currentStep.id + 1}`
    : 'Continue';

  const stepLabel = currentStep
    ? `Step ${currentStep.id} · ${currentStep.label}`
    : 'Step 5 · Review Deductions';

  const handleStepClick = (step: SalaryProcessingWizardStep) => {
    toast({
      title: `Step ${step.id}: ${step.label}`,
      description: LATER
    });
  };

  const handleContinue = () => {
    toast({
      title: continueLabel,
      description: LATER
    });
  };

  const handleCyclePayslipPreview = () => {
    setCyclePayslipOpen(true);
  };

  const handleViewStaffPayslip = (record: SalaryProcessingBreakdownRow) => {
    setSelectedRecord(record);
    setStaffPayslipOpen(true);
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Salary Processing"
        description={contextDescription}
        actions={
          <SalaryProcessingHeaderActions
            onPayslipPreview={handleCyclePayslipPreview}
            onContinue={handleContinue}
            continueLabel={continueLabel}
          />
        }
      />

      <SectionWizard
        steps={SALARY_PROCESSING_WIZARD_STEPS}
        onStepClick={handleStepClick}
      />

      <SectionProcessingSummary summary={summary} />

      <SectionSalaryBreakdown
        records={records}
        totalRecords={records.length}
        stepLabel={stepLabel}
        onViewPayslip={handleViewStaffPayslip}
        onCyclePayslipPreview={handleCyclePayslipPreview}
      />

      <DialogCyclePayslip
        open={cyclePayslipOpen}
        setOpen={setCyclePayslipOpen}
        summary={summary}
      />

      <DialogStaffPayslip
        open={staffPayslipOpen}
        setOpen={(open) => {
          setStaffPayslipOpen(open);
          if (!open) setSelectedRecord(null);
        }}
        record={selectedRecord}
      />
    </div>
  );
}
