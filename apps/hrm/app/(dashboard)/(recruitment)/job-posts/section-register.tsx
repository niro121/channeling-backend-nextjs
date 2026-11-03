'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  JobPostFilters,
  JobPostRecord,
  VacancySelectOption
} from '@/types/recruitment';
import {
  JOB_POST_EXPORT_COLUMNS,
  JOB_POST_EXPORT_KEYS,
  jobPostColumns
} from './columns';
import SectionFilters from './section-filters';

type JobPostExportRow = {
  jobPostId: string;
  jobTitle: string;
  department: string;
  designation: string;
  employmentType: string;
  openings: number;
  postedDate: string;
  closingDate: string;
  applicationsCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type SectionRegisterProps = {
  records?: JobPostRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: JobPostFilters;
  departmentOptions?: VacancySelectOption[];
  designationOptions?: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: JobPostExportRow[];
    message?: string;
  }>;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  departmentOptions = [],
  designationOptions = [],
  onExport
}: SectionRegisterProps) {
  return (
    <div className="space-y-4">
      <SectionFilters
        initial={initialFilters}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading job posts...
          </div>
        }
      >
        <CommonDataTable
          heading="Job Post Register"
          subHeading="Publish and manage job posts linked to approved vacancy requests."
          columns={jobPostColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={onExport}
              columns={[...JOB_POST_EXPORT_COLUMNS]}
              keys={[...JOB_POST_EXPORT_KEYS]}
              title="Job Posts"
              fileName="job-posts"
            />
          }
        />
      </Suspense>
    </div>
  );
}
