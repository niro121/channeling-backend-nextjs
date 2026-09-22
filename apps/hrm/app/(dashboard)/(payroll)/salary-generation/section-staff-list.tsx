'use client';

import { Suspense } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useToast
} from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  SalaryFilterOption,
  SalaryGenerationStaffFilters,
  SalaryGenerationStaffRow
} from '@/types/payroll';
import { salaryGenerationStaffColumns } from './columns';
import SectionStaffFilters from './section-staff-filters';

type SectionStaffListProps = {
  records?: SalaryGenerationStaffRow[];
  totalRecords?: number;
  page?: string;
  initialFilters?: SalaryGenerationStaffFilters;
  staffOptions?: SalaryFilterOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
};

export default function SectionStaffList({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = []
}: SectionStaffListProps) {
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
