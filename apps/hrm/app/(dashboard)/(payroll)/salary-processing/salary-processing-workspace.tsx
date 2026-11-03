'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Combobox, Label, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  approvePayrollRunAction,
  getSalaryProcessingWorkspaceAction,
  holdPayrollRunAction,
  recalculatePayrollStatutoryAction,
  releasePayrollRunHoldAction
} from '@/app/actions/payroll-actions/salary-processing.actions';
import { formatAmount } from '@/lib/utils/currency';
import {
  EMPTY_SALARY_PROCESSING_SUMMARY,
  SALARY_PROCESSING_WIZARD_STEPS,
  type SalaryProcessingBreakdownRow,
  type SalaryProcessingRunOption,
  type SalaryProcessingWizardStep,
  type SalaryProcessingWorkspaceData
} from '@/types/payroll';
import DialogCyclePayslip from './dialog-cycle-payslip';
import DialogStaffPayslip from './dialog-staff-payslip';
import { SalaryProcessingHeaderActions } from './header-actions';
import SectionProcessingSummary from './section-processing-summary';
import SectionSalaryBreakdown from './section-salary-breakdown';
import SectionWizard from './section-wizard';

type SalaryProcessingWorkspaceProps = {
  runOptions?: SalaryProcessingRunOption[];
  initialRunId?: string | null;
  initialWorkspace?: SalaryProcessingWorkspaceData | null;
};

export default function SalaryProcessingWorkspace({
  runOptions = [],
  initialRunId = null,
  initialWorkspace = null
}: SalaryProcessingWorkspaceProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [runId, setRunId] = useState<string | null>(initialRunId);
  const [workspace, setWorkspace] = useState<SalaryProcessingWorkspaceData | null>(
    initialWorkspace
  );
  const [localStepId, setLocalStepId] = useState<number | null>(
    initialWorkspace?.currentStepId ?? null
  );
  const [cyclePayslipOpen, setCyclePayslipOpen] = useState(false);
  const [staffPayslipOpen, setStaffPayslipOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<SalaryProcessingBreakdownRow | null>(null);

  const summary = workspace?.summary ?? EMPTY_SALARY_PROCESSING_SUMMARY;
  const records = workspace?.rows ?? [];

  const wizardSteps = useMemo(() => {
    const base = workspace?.wizardSteps ?? SALARY_PROCESSING_WIZARD_STEPS;
    if (!localStepId) return base;
    return base.map((step) => ({
      ...step,
      status:
        step.id < localStepId
          ? ('completed' as const)
          : step.id === localStepId
            ? ('current' as const)
            : ('pending' as const)
    }));
  }, [workspace?.wizardSteps, localStepId]);

  const currentStep = useMemo(
    () =>
      wizardSteps.find((step) => step.status === 'current') ??
      wizardSteps[wizardSteps.length - 1],
    [wizardSteps]
  );

  const contextDescription = [
    summary.periodLabel ?? '—',
    `${formatAmount(summary.staffCount)} staff`,
    `Initiated by ${summary.initiatedBy ?? '—'}`,
    summary.runCode ? `Run ${summary.runCode}` : null,
    summary.runStatus ? `(${summary.runStatus})` : null
  ]
    .filter(Boolean)
    .join(' · ');

  const continueLabel = (() => {
    if (!runId) return 'Select a run';
    if (!currentStep) return 'Continue';
    if (currentStep.id === 3) return 'Calculate Salary';
    if (currentStep.id === 7 && summary.runStatus === 'on_hold') {
      return 'Release Hold';
    }
    if (currentStep.id === 7) return 'Approve Payroll';
    if (currentStep.id >= 8) return 'Open Bank Transfer';
    return `Continue to Step ${Math.min(currentStep.id + 1, 8)}`;
  })();

  const stepLabel = currentStep
    ? `Step ${currentStep.id} · ${currentStep.label}`
    : 'Step 5 · Review Deductions';

  const applyWorkspace = (data: SalaryProcessingWorkspaceData) => {
    setWorkspace(data);
    setRunId(data.runId);
    setLocalStepId(data.currentStepId);
  };

  const handleSelectRun = (nextId: string) => {
    if (!nextId) return;
    startTransition(async () => {
      const result = await getSalaryProcessingWorkspaceAction(nextId);
      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Load failed',
          description:
            (typeof result.errors?.message === 'string' &&
              result.errors.message) ||
            'Unable to load payroll run.'
        });
        return;
      }
      applyWorkspace(result.data);
      router.replace(`/salary-processing?runId=${nextId}`);
    });
  };

  const handleStepClick = (step: SalaryProcessingWizardStep) => {
    if (!runId) {
      toast({
        title: 'Select a payroll run',
        description: 'Choose a generated salary run to process.'
      });
      return;
    }
    setLocalStepId(step.id);
  };

  const handleContinue = () => {
    if (!runId || !currentStep) {
      toast({
        title: 'Select a payroll run',
        description: 'Generate a salary run first, then process it here.'
      });
      return;
    }

    if (currentStep.id === 3) {
      startTransition(async () => {
        const result = await recalculatePayrollStatutoryAction(runId);
        if (result.isError || !result.data) {
          toast({
            variant: 'destructive',
            title: 'Calculate failed',
            description:
              (typeof result.errors?.message === 'string' &&
                result.errors.message) ||
              'Unable to calculate statutory amounts.'
          });
          return;
        }
        applyWorkspace(result.data);
        toast({
          variant: 'success',
          title: 'Salary calculated',
          description: `EPF/ETF/PAYE applied · net ${formatAmount(
            result.data.summary.netPayable
          )}`
        });
      });
      return;
    }

    if (currentStep.id === 7) {
      startTransition(async () => {
        const result =
          summary.runStatus === 'on_hold'
            ? await releasePayrollRunHoldAction(runId)
            : await approvePayrollRunAction(runId);
        if (result.isError || !result.data) {
          toast({
            variant: 'destructive',
            title:
              summary.runStatus === 'on_hold'
                ? 'Release failed'
                : 'Approve failed',
            description:
              (typeof result.errors?.message === 'string' &&
                result.errors.message) ||
              'Unable to complete action.'
          });
          return;
        }
        applyWorkspace(result.data);
        toast({
          variant: 'success',
          title:
            summary.runStatus === 'on_hold'
              ? 'Hold released'
              : 'Payroll approved',
          description:
            summary.runStatus === 'on_hold'
              ? `${result.data.runCode} returned to generated`
              : `${result.data.runCode} marked processed · loan balances updated`
        });
        router.refresh();
      });
      return;
    }

    if (currentStep.id >= 8) {
      router.push('/bank-transfer-file');
      return;
    }

    setLocalStepId(Math.min(currentStep.id + 1, 8));
  };

  const handleHold = () => {
    if (!runId) return;
    startTransition(async () => {
      const result = await holdPayrollRunAction(runId, 'Held from processing UI');
      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Hold failed',
          description:
            (typeof result.errors?.message === 'string' &&
              result.errors.message) ||
            'Unable to hold payroll.'
        });
        return;
      }
      applyWorkspace(result.data);
      toast({
        title: 'Payroll on hold',
        description: result.data.runCode
      });
      router.refresh();
    });
  };

  const handleCyclePayslipPreview = () => {
    setCyclePayslipOpen(true);
  };

  const handleViewStaffPayslip = (record: SalaryProcessingBreakdownRow) => {
    setSelectedRecord(record);
    setStaffPayslipOpen(true);
  };

  const comboboxOptions = runOptions.map((item) => ({
    id: item.id,
    name: item.name
  }));

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Salary Processing"
        description={contextDescription}
        actions={
          <SalaryProcessingHeaderActions
            busy={pending}
            canHold={
              !!runId &&
              (summary.runStatus === 'generated' ||
                summary.runStatus === 'on_hold')
            }
            onPayslipPreview={handleCyclePayslipPreview}
            onHold={handleHold}
            onContinue={handleContinue}
            continueLabel={continueLabel}
          />
        }
      />

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payroll run
        </Label>
        <div className="mt-2 max-w-xl">
          <Combobox
            label="Select generated payroll run"
            options={comboboxOptions}
            value={runId ?? ''}
            defaultValue=""
            onChange={(value) => handleSelectRun(value)}
            clearable={false}
            triggerClassName="w-full max-w-none font-normal!"
            popoverClassName="w-[var(--radix-popover-trigger-width)] min-w-60"
          />
        </div>
        {!runOptions.length ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No generated runs yet. Create one from Salary Generation (Save
            Salary), then return here.
          </p>
        ) : null}
      </div>

      <SectionWizard steps={wizardSteps} onStepClick={handleStepClick} />

      <SectionProcessingSummary summary={summary} />

      <SectionSalaryBreakdown
        runId={runId}
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
