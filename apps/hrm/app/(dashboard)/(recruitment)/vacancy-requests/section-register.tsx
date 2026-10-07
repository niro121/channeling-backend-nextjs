'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_PRIORITY_LABELS,
  VACANCY_REQUEST_STATUS_LABELS,
  type VacancyRequestFilters,
  type VacancyRequestRecord
} from '@/types/recruitment';
import {
  VACANCY_EXPORT_COLUMNS,
  VACANCY_EXPORT_KEYS,
  vacancyRequestColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: VacancyRequestRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: VacancyRequestFilters;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {}
}: SectionRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    if (!records.length) {
      toast({
        title: 'Export',
        description: 'No vacancy requests to export.'
      });
      return {
        success: false,
        message: 'No vacancy requests found'
      };
    }

    const data = records.map((row) => ({
      requestId: row.requestId,
      department: row.department,
      designation: row.designation,
      vacancies: row.vacancies,
      employmentType:
        VACANCY_EMPLOYMENT_TYPE_LABELS[row.employmentType] ??
        row.employmentType,
      requestedBy: row.requestedBy,
      requestedDate: row.requestedDate,
      requiredDate: row.requiredDate,
      priority: VACANCY_PRIORITY_LABELS[row.priority] ?? row.priority,
      status: VACANCY_REQUEST_STATUS_LABELS[row.status] ?? row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return { success: true, data };
  };

  return (
    <div className="space-y-4">
      <SectionFilters initial={initialFilters} />

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
              serverData={handleExport}
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
