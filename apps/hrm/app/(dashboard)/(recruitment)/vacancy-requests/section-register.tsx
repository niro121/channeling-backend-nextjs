'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type {
  VacancyRequestFilters,
  VacancyRequestRecord,
  VacancySelectOption
} from '@/types/recruitment';
import {
  VACANCY_EXPORT_COLUMNS,
  VACANCY_EXPORT_KEYS,
  vacancyRequestColumns
} from './columns';
import SectionFilters from './section-filters';

type VacancyExportRow = {
  requestId: string;
  department: string;
  designation: string;
  vacancies: number;
  employmentType: string;
  requestedBy: string;
  requestedDate: string;
  requiredDate: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type SectionRegisterProps = {
  records?: VacancyRequestRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: VacancyRequestFilters;
  departmentOptions?: VacancySelectOption[];
  designationOptions?: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: VacancyExportRow[];
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
            Loading vacancy requests...
          </div>
        }
      >
        <CommonDataTable
          heading="Vacancy Request Register"
          subHeading="Raise, approve and track staffing vacancy requests across departments."
          columns={vacancyRequestColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={onExport}
              columns={[...VACANCY_EXPORT_COLUMNS]}
              keys={[...VACANCY_EXPORT_KEYS]}
              title="Vacancy Requests"
              fileName="vacancy-requests"
            />
          }
        />
      </Suspense>
    </div>
  );
}
