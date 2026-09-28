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
  EMPTY_DEDUCTIONS_BREAKDOWN,
  EMPTY_EARNINGS_BREAKDOWN,
  EMPTY_SALARY_GENERATION_CYCLE_VALUES,
  EMPTY_SALARY_GENERATION_SUMMARY,
  type SalaryGenerationCycleFormValues,
  type SalaryGenerationPreviewRow,
  type SalaryGenerationStaffRow,
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
};

export default function SalaryGenerationWorkspace({
  cycleOptions = []
}: SalaryGenerationWorkspaceProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SalaryGenerationTab>('cycle');
  const [cycleValues, setCycleValues] =
    useState<SalaryGenerationCycleFormValues>(
      EMPTY_SALARY_GENERATION_CYCLE_VALUES
    );
  const [formKey, setFormKey] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [staffRows] = useState<SalaryGenerationStaffRow[]>([]);
  const [previewRows] = useState<SalaryGenerationPreviewRow[]>([]);

  const staffCount = staffRows.length;
  const staffCountLabel = `${formatAmount(staffCount)} staff`;

  const selectedCycleLabel = useMemo(() => {
    if (!cycleValues.salaryCycleId) return null;
    return (
      cycleOptions.find((item) => item.id === cycleValues.salaryCycleId)
        ?.name ?? cycleValues.salaryCycleId
    );
  }, [cycleOptions, cycleValues.salaryCycleId]);

  const salarySummary = {
    ...EMPTY_SALARY_GENERATION_SUMMARY,
    employeeCount: staffCount
  };

  const handleGenerate = () => {
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

    setGenerated(true);
    setActiveTab('staff-list');
    toast({
      variant: 'success',
      title: 'Cycle ready',
      description:
        'Staff List and Staff Salary tabs are available. Live generation will follow in the dynamic phase.'
    });
  };

  const handleSave = () => {
    toast({
      title: 'Save Salary',
      description: 'Will be wired in the dynamic phase.'
    });
  };

  const handleClear = () => {
    setCycleValues(EMPTY_SALARY_GENERATION_CYCLE_VALUES);
    setGenerated(false);
    setActiveTab('cycle');
    setFormKey((key) => key + 1);
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
        onGenerate={handleGenerate}
        onSave={handleSave}
        onClear={handleClear}
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
          <SectionStaffList records={staffRows} totalRecords={staffCount} />
        </TabsContent>

        <TabsContent value="staff-salary" className="mt-0">
          <SectionStaffSalary
            summary={salarySummary}
            earningsBreakdown={EMPTY_EARNINGS_BREAKDOWN}
            deductionsBreakdown={EMPTY_DEDUCTIONS_BREAKDOWN}
            previewRows={previewRows}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
