'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  ApplicationFilters,
  ApplicationRecord,
  VacancySelectOption
} from '@/types/recruitment';
import {
  APPLICATION_EXPORT_COLUMNS,
  APPLICATION_EXPORT_KEYS,
  applicationColumns
} from './columns';
import SectionFilters from './section-filters';

type ApplicationExportRow = {
  applicationId: string;
  candidateName: string;
  jobPostCode: string;
  jobTitle: string;
  department: string;
  appliedDate: string;
  experienceYears: string;
  source: string;
  currentStage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type SectionRegisterProps = {
  records?: ApplicationRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: ApplicationFilters;
  departmentOptions?: VacancySelectOption[];
  jobPostOptions?: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: ApplicationExportRow[];
    message?: string;
  }>;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  departmentOptions = [],
  jobPostOptions = [],
  onExport
}: SectionRegisterProps) {
  return (
    <div className="space-y-4">
      <SectionFilters
        initial={initialFilters}
        departmentOptions={departmentOptions}
        jobPostOptions={jobPostOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading applications...
          </div>
        }
      >
        <CommonDataTable
          heading="Application Register"
          subHeading="Track every candidate application through the recruitment stages."
          columns={applicationColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={onExport}
              columns={[...APPLICATION_EXPORT_COLUMNS]}
              keys={[...APPLICATION_EXPORT_KEYS]}
              title="Applications"
              fileName="applications"
            />
          }
        />
      </Suspense>
    </div>
  );
}
