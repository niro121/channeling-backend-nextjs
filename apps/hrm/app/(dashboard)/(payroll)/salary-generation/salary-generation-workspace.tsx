'use client';

import { useMemo, useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast
} from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import {
  clearPayrollRunAction,
  generatePayrollRunAction,
  refillPayrollRunAction,
  savePayrollRunAction
} from '@/app/actions/payroll-actions/payroll-run.actions';
import {
  EMPTY_DEDUCTIONS_BREAKDOWN,
  EMPTY_EARNINGS_BREAKDOWN,
  EMPTY_SALARY_GENERATION_CYCLE_VALUES,
  EMPTY_SALARY_GENERATION_SUMMARY,
  type SalaryBreakdownChartPoint,
  type SalaryFilterOption,
  type SalaryGenerationCycleFormValues,
  type SalaryGenerationFillMode,
  type SalaryGenerationPreviewRow,
  type SalaryGenerationStaffFilters,
  type SalaryGenerationStaffRow,
  type SalaryGenerationSummary,
  type SalaryGenerationTab
} from '@/types/payroll';
import type { SalaryCycleOption } from '@/types/salary-cycle';
import { formatAmount } from '@/lib/utils/currency';
import { SalaryGenerationHeaderActions } from './header-actions';
import SectionCycle from './section-cycle';
import SectionStaffList from './section-staff-list';
import SectionStaffSalary from './section-staff-salary';

type SalaryGenerationWorkspaceProps = {
  cycleOptions?: SalaryCycleOption[];
  staffOptions?: SalaryFilterOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
};

export default function SalaryGenerationWorkspace({
  cycleOptions = [],
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = []
}: SalaryGenerationWorkspaceProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SalaryGenerationTab>('cycle');
  const [cycleValues, setCycleValues] =
    useState<SalaryGenerationCycleFormValues>(
      EMPTY_SALARY_GENERATION_CYCLE_VALUES
    );
  const [formKey, setFormKey] = useState(0);
  const [runId, setRunId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [staffRows, setStaffRows] = useState<SalaryGenerationStaffRow[]>([]);
  const [previewRows, setPreviewRows] = useState<SalaryGenerationPreviewRow[]>(
    []
  );
  const [summary, setSummary] = useState<SalaryGenerationSummary>(
    EMPTY_SALARY_GENERATION_SUMMARY
  );
  const [earningsBreakdown, setEarningsBreakdown] = useState<
    SalaryBreakdownChartPoint[]
  >(EMPTY_EARNINGS_BREAKDOWN);
  const [deductionsBreakdown, setDeductionsBreakdown] = useState<
    SalaryBreakdownChartPoint[]
  >(EMPTY_DEDUCTIONS_BREAKDOWN);
  const [staffFilters, setStaffFilters] =
    useState<SalaryGenerationStaffFilters>({});

  const staffCount = staffRows.length;
  const staffCountLabel = `${formatAmount(staffCount)} staff`;
  const generated = runId != null;

  const selectedCycleLabel = useMemo(() => {
    if (!cycleValues.salaryCycleId) return null;
    return (
      cycleOptions.find((item) => item.id === cycleValues.salaryCycleId)
        ?.name ?? cycleValues.salaryCycleId
    );
  }, [cycleOptions, cycleValues.salaryCycleId]);

  const applyResult = (result: {
    run: {
      id: string;
      summary: SalaryGenerationSummary;
      earningsBreakdown: SalaryBreakdownChartPoint[];
      deductionsBreakdown: SalaryBreakdownChartPoint[];
    };
    staffRows: SalaryGenerationStaffRow[];
    previewRows: SalaryGenerationPreviewRow[];
  }) => {
    setRunId(result.run.id);
    setStaffRows(result.staffRows);
    setPreviewRows(result.previewRows);
    setSummary(result.run.summary);
    setEarningsBreakdown(result.run.earningsBreakdown);
    setDeductionsBreakdown(result.run.deductionsBreakdown);
  };

  const resetGeneratedState = () => {
    setRunId(null);
    setStaffRows([]);
    setPreviewRows([]);
    setSummary(EMPTY_SALARY_GENERATION_SUMMARY);
    setEarningsBreakdown(EMPTY_EARNINGS_BREAKDOWN);
    setDeductionsBreakdown(EMPTY_DEDUCTIONS_BREAKDOWN);
  };

  const handleGenerate = async () => {
    if (!cycleValues.salaryCycleId) {
      toast({
        title: 'Select a salary cycle',
        description: 'Choose a salary cycle before generating salary.'
      });
      setActiveTab('cycle');
      return;
    }

    if (
      !cycleValues.salaryFromDate ||
      !cycleValues.salaryToDate ||
      !cycleValues.workedFromDate ||
      !cycleValues.workedToDate
    ) {
      toast({
        title: 'Complete cycle dates',
        description: 'Salary and worked date ranges are required.'
      });
      setActiveTab('cycle');
      return;
    }

    setBusy(true);
    try {
      const result = await generatePayrollRunAction({
        salaryCycleId: cycleValues.salaryCycleId,
        salaryFromDate: cycleValues.salaryFromDate,
        salaryToDate: cycleValues.salaryToDate,
        workedFromDate: cycleValues.workedFromDate,
        workedToDate: cycleValues.workedToDate,
        fillMode: 'all',
        filters: staffFilters
      });

      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Generate failed',
          description:
            (typeof result.errors?.message === 'string' &&
              result.errors.message) ||
            'Unable to generate salary.'
        });
        return;
      }

      applyResult(result.data);
      setActiveTab('staff-list');
      toast({
        variant: 'success',
        title: 'Salary generated',
        description: `${result.data.run.code} · ${formatAmount(
          result.data.run.staffCount
        )} staff · net ${formatAmount(result.data.run.summary.netPayable)}`
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFill = async (fillMode: SalaryGenerationFillMode) => {
    if (!runId) {
      toast({
        title: 'Generate salary first',
        description: 'Select a cycle and click Generate Salary first.'
      });
      return;
    }

    setBusy(true);
    try {
      const result = await refillPayrollRunAction(runId, fillMode, staffFilters);
      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Fill failed',
          description:
            (typeof result.errors?.message === 'string' &&
              result.errors.message) ||
            'Unable to fill staff.'
        });
        return;
      }

      applyResult(result.data);
      toast({
        variant: 'success',
        title: 'Staff filled',
        description: `${formatAmount(result.data.run.staffCount)} staff in run`
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!runId) {
      toast({
        title: 'Nothing to save',
        description: 'Generate salary before saving.'
      });
      return;
    }

    setBusy(true);
    try {
      const result = await savePayrollRunAction(runId);
      if (result.isError || !result.data) {
        toast({
          variant: 'destructive',
          title: 'Save failed',
          description:
            (typeof result.errors?.message === 'string' &&
              result.errors.message) ||
            'Unable to save salary.'
        });
        return;
      }

      applyResult(result.data);
      toast({
        variant: 'success',
        title: 'Salary saved',
        description: `${result.data.run.code} marked as generated`
      });
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      if (runId) {
        const result = await clearPayrollRunAction(runId);
        if (result.isError) {
          toast({
            variant: 'destructive',
            title: 'Clear failed',
            description:
              (typeof result.errors?.message === 'string' &&
                result.errors.message) ||
              'Unable to clear salary run.'
          });
          return;
        }
      }

      setCycleValues(EMPTY_SALARY_GENERATION_CYCLE_VALUES);
      resetGeneratedState();
      setActiveTab('cycle');
      setFormKey((key) => key + 1);
      toast({
        title: 'Cleared',
        description: 'Salary generation draft was cleared.'
      });
    } finally {
      setBusy(false);
    }
  };

  const handleTabChange = (value: string) => {
    const next = value as SalaryGenerationTab;
    if ((next === 'staff-list' || next === 'staff-salary') && !generated) {
      toast({
        title: 'Generate salary first',
        description:
          'Select a cycle and click Generate Salary to open the next steps.'
      });
      return;
    }
    setActiveTab(next);
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Salary Generation"
        description="Salary cycle → staff list → generated salary."
      />

      <SalaryGenerationHeaderActions
        cycleLabel={selectedCycleLabel}
        staffCountLabel={staffCountLabel}
        busy={busy}
        onGenerate={() => void handleGenerate()}
        onSave={() => void handleSave()}
        onClear={() => void handleClear()}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full space-y-6"
      >
        <TabsList className="w-full justify-start gap-5 bg-secondary">
          <TabsTrigger
            value="cycle"
            className="data-[state=active]:text-primary text-base"
          >
            Cycle
          </TabsTrigger>
          <TabsTrigger
            value="staff-list"
            className="data-[state=active]:text-primary text-base"
          >
            Staff List
          </TabsTrigger>
          <TabsTrigger
            value="staff-salary"
            className="data-[state=active]:text-primary text-base"
          >
            Staff Salary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cycle" className="mt-0">
          <SectionCycle
            cycleOptions={cycleOptions}
            initialValues={cycleValues}
            formKey={String(formKey)}
            onValuesChange={setCycleValues}
          />
        </TabsContent>

        <TabsContent value="staff-list" className="mt-0">
          <SectionStaffList
            runId={runId}
            records={staffRows}
            totalRecords={staffCount}
            staffOptions={staffOptions}
            departmentOptions={departmentOptions}
            designationOptions={designationOptions}
            rosterOptions={rosterOptions}
            initialFilters={staffFilters}
            busy={busy}
            onFill={(mode) => void handleFill(mode)}
            onFiltersChange={setStaffFilters}
          />
        </TabsContent>

        <TabsContent value="staff-salary" className="mt-0">
          <SectionStaffSalary
            runId={runId}
            summary={summary}
            earningsBreakdown={earningsBreakdown}
            deductionsBreakdown={deductionsBreakdown}
            previewRows={previewRows}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
