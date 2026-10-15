'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DollarSign, Percent } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  PerformanceAllowanceFilters,
  PerformanceAllowanceMode,
  PerformanceAllowanceRecord,
  PerformanceAllowanceSummary,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';
import {
  PerformanceAllowanceUiProvider,
  usePerformanceAllowanceUi
} from './performance-allowance-ui-context';
import DialogView from './dialog-view';
import SectionForm from './section-form';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';

type PerformanceAllowanceWorkspaceProps = {
  mode: PerformanceAllowanceMode;
  initialRecords: PerformanceAllowanceRecord[];
  totalRecords: number;
  summary: PerformanceAllowanceSummary;
  page?: string;
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  initialFilters?: PerformanceAllowanceFilters;
};

function PerformanceAllowanceWorkspaceInner({
  mode,
  initialRecords,
  totalRecords,
  summary,
  page,
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  initialFilters
}: PerformanceAllowanceWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { viewRecord, editingRecord, clearEdit, closeView } =
    usePerformanceAllowanceUi();

  const handleModeChange = (value: string) => {
    const next = value as PerformanceAllowanceMode;
    if (editingRecord && editingRecord.mode !== next) {
      clearEdit();
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', next);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Performance Allowance"
        description="Configure percentage-based or fixed-value performance allowances for staff."
      />

      <SectionSummary mode={mode} summary={summary} />

      <Tabs
        value={mode}
        onValueChange={handleModeChange}
        className="w-full space-y-6"
      >
        <TabsList className="w-full justify-start gap-5 bg-secondary">
          <TabsTrigger
            value="percentage"
            className="data-[state=active]:text-primary text-base"
          >
            <span className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Percentage
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="fixed"
            className="data-[state=active]:text-primary text-base"
          >
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fixed Value
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="percentage" className="mt-0 space-y-6">
          {mode === 'percentage' ? (
            <>
              <SectionForm mode="percentage" staffOptions={staffOptions} />
              <SectionRegister
                mode="percentage"
                records={initialRecords}
                totalRecords={totalRecords}
                page={page}
                staffOptions={staffOptions}
                departmentOptions={departmentOptions}
                designationOptions={designationOptions}
                initialFilters={initialFilters}
              />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="fixed" className="mt-0 space-y-6">
          {mode === 'fixed' ? (
            <>
              <SectionForm mode="fixed" staffOptions={staffOptions} />
              <SectionRegister
                mode="fixed"
                records={initialRecords}
                totalRecords={totalRecords}
                page={page}
                staffOptions={staffOptions}
                departmentOptions={departmentOptions}
                designationOptions={designationOptions}
                initialFilters={initialFilters}
              />
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <DialogView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />
    </div>
  );
}

export default function PerformanceAllowanceWorkspace(
  props: PerformanceAllowanceWorkspaceProps
) {
  return (
    <PerformanceAllowanceUiProvider>
      <PerformanceAllowanceWorkspaceInner {...props} />
    </PerformanceAllowanceUiProvider>
  );
}
