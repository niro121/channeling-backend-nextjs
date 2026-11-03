'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  SalaryFilterOption,
  SalaryStructureRecord
} from '@/types/payroll';
import {
  SALARY_STRUCTURE_EXPORT_COLUMNS,
  SALARY_STRUCTURE_EXPORT_KEYS,
  salaryStructureColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: SalaryStructureRecord[];
  totalRecords?: number;
  page?: string;
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  structureOptions?: SalaryFilterOption[];
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  departmentOptions = [],
  designationOptions = [],
  structureOptions = []
}: SectionRegisterProps) {
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
      <SectionFilters
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        structureOptions={structureOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading salary structures...
          </div>
        }
      >
        <CommonDataTable
          heading="Salary Structures"
          subHeading="Grade and role templates with default basic, allowances, and deductions."
          columns={salaryStructureColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...SALARY_STRUCTURE_EXPORT_COLUMNS]}
              keys={[...SALARY_STRUCTURE_EXPORT_KEYS]}
              title="Salary Structures"
              fileName="salary-structures"
            />
          }
        />
      </Suspense>
    </div>
  );
}
