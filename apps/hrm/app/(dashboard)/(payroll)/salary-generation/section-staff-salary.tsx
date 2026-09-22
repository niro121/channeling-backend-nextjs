'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  SalaryBreakdownChartPoint,
  SalaryGenerationPreviewRow,
  SalaryGenerationSummary
} from '@/types/payroll';
import {
  EMPTY_DEDUCTIONS_BREAKDOWN,
  EMPTY_EARNINGS_BREAKDOWN,
  EMPTY_SALARY_GENERATION_SUMMARY
} from '@/types/payroll';
import { salaryGenerationPreviewColumns } from './columns';
import SectionSalaryCharts from './section-salary-charts';
import SectionSalarySummary from './section-salary-summary';

type SectionStaffSalaryProps = {
  summary?: SalaryGenerationSummary;
  earningsBreakdown?: SalaryBreakdownChartPoint[];
  deductionsBreakdown?: SalaryBreakdownChartPoint[];
  previewRows?: SalaryGenerationPreviewRow[];
  page?: string;
};

export default function SectionStaffSalary({
  summary = EMPTY_SALARY_GENERATION_SUMMARY,
  earningsBreakdown = EMPTY_EARNINGS_BREAKDOWN,
  deductionsBreakdown = EMPTY_DEDUCTIONS_BREAKDOWN,
  previewRows = [],
  page
}: SectionStaffSalaryProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    toast({
      title: 'Export',
      description: 'Will be wired in the dynamic phase.'
    });
    return {
      success: false,
      message: 'Export will be wired in the dynamic phase.'
    };
  };

  return (
    <div className="space-y-4">
      <SectionSalarySummary summary={summary} />
      <SectionSalaryCharts
        earnings={earningsBreakdown}
        deductions={deductionsBreakdown}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading salary preview...
          </div>
        }
      >
        <CommonDataTable
          heading="Generated Salary Preview"
          subHeading="Per-staff earnings and deductions for the current cycle."
          columns={salaryGenerationPreviewColumns}
          data={previewRows}
          rowCount={previewRows.length}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[
                'Employee',
                'Basic',
                'Allowances',
                'OT',
                'Gross',
                'EPF 8%',
                'PAYE',
                'Loans',
                'Net'
              ]}
              keys={[
                'employee',
                'basic',
                'allowances',
                'ot',
                'gross',
                'epf8',
                'paye',
                'loans',
                'net'
              ]}
              title="Generated Salary Preview"
              fileName="salary-generation-preview"
            />
          }
        />
      </Suspense>
    </div>
  );
}
