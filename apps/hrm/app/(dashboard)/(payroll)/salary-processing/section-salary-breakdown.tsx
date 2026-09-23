'use client';

import { Suspense, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { SalaryProcessingBreakdownRow } from '@/types/payroll';
import { createSalaryProcessingColumns } from './columns';

type SectionSalaryBreakdownProps = {
  records?: SalaryProcessingBreakdownRow[];
  totalRecords?: number;
  page?: string;
  stepLabel: string;
  onViewPayslip: (record: SalaryProcessingBreakdownRow) => void;
  onCyclePayslipPreview: () => void;
};

export default function SectionSalaryBreakdown({
  records = [],
  totalRecords = 0,
  page,
  stepLabel,
  onViewPayslip,
  onCyclePayslipPreview
}: SectionSalaryBreakdownProps) {
  const { toast } = useToast();

  const columns = useMemo(
    () => createSalaryProcessingColumns({ onView: onViewPayslip }),
    [onViewPayslip]
  );

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
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading salary breakdown...
        </div>
      }
    >
      <CommonDataTable
        heading={`Salary Breakdown · ${stepLabel}`}
        subHeading="Review calculated amounts for the current payroll processing step."
        columns={columns}
        data={records}
        rowCount={totalRecords}
        page={page}
        showPagination
        headingRight={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={onCyclePayslipPreview}
          >
            <FileText className="h-4 w-4" />
            Payslip Preview
          </Button>
        }
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[
              'Staff',
              'Staff Code',
              'Basic',
              'OT',
              'Allowances',
              'Deductions',
              'EPF (12%)',
              'ETF (3%)',
              'PAYE',
              'Net Salary'
            ]}
            keys={[
              'staffName',
              'staffCode',
              'basic',
              'ot',
              'allowances',
              'deductions',
              'epf12',
              'etf3',
              'paye',
              'netSalary'
            ]}
            title="Salary Processing Breakdown"
            fileName="salary-processing-breakdown"
          />
        }
      />
    </Suspense>
  );
}
