'use client';

import { Suspense, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { getPayrollRunStaffExportAction } from '@/app/actions/payroll-actions/payroll-run.actions';
import type {
  SalaryFilterOption,
  SalaryGenerationFillMode,
  SalaryGenerationStaffFilters,
  SalaryGenerationStaffRow
} from '@/types/payroll';
import { salaryGenerationStaffColumns } from './columns';
import SectionStaffFilters from './section-staff-filters';

type SectionStaffListProps = {
  runId?: string | null;
  records?: SalaryGenerationStaffRow[];
  totalRecords?: number;
  page?: string;
  initialFilters?: SalaryGenerationStaffFilters;
  staffOptions?: SalaryFilterOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
  busy?: boolean;
  onFill?: (mode: SalaryGenerationFillMode) => void;
  onFiltersChange?: (filters: SalaryGenerationStaffFilters) => void;
};

export default function SectionStaffList({
  runId = null,
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = [],
  busy = false,
  onFill,
  onFiltersChange
}: SectionStaffListProps) {
  const handleFiltersChange = useCallback(
    (values: Record<string, string | undefined>) => {
      onFiltersChange?.({
        staffId: values.staffId || undefined,
        institution: values.institution || undefined,
        departmentId: values.departmentId || undefined,
        staffCategory: values.staffCategory || undefined,
        designationId: values.designationId || undefined,
        rosterId: values.rosterId || undefined
      });
    },
    [onFiltersChange]
  );

  const handleExport = async () => {
    if (!runId) {
      return {
        success: false,
        message: 'Generate salary before exporting.'
      };
    }
    const result = await getPayrollRunStaffExportAction(runId);
    if (!result.success) {
      return {
        success: false,
        message: result.message ?? 'Export failed'
      };
    }
    return {
      success: true,
      data: result.data ?? []
    };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Fill Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionStaffFilters
            staffOptions={staffOptions}
            departmentOptions={departmentOptions}
            designationOptions={designationOptions}
            rosterOptions={rosterOptions}
            initial={initialFilters}
            busy={busy}
            onFill={onFill}
            onValuesChange={handleFiltersChange}
          />
        </CardContent>
      </Card>

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading staff list...
          </div>
        }
      >
        <CommonDataTable
          heading="Staff List"
          subHeading="Staff included in the current salary generation cycle."
          columns={salaryGenerationStaffColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          haveBulkDelete
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[
                'Roster',
                'Resigned Date',
                'Working Days(PH)',
                'Working Days(Work)',
                'Designation',
                'Code',
                'Name'
              ]}
              keys={[
                'roster',
                'resignedDate',
                'workingDaysPh',
                'workingDaysWork',
                'designation',
                'code',
                'name'
              ]}
              title="Salary Generation Staff List"
              fileName="salary-generation-staff-list"
            />
          }
        />
      </Suspense>
    </div>
  );
}
