'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  PROBATION_REVIEW_STATUS_LABELS,
  type ProbationReviewFilters,
  type ProbationReviewRecord
} from '@/types/performance';
import {
  PROBATION_REVIEW_EXPORT_COLUMNS,
  PROBATION_REVIEW_EXPORT_KEYS,
  probationReviewColumns
} from './columns';
import SectionFilters, { type FilterOption } from './section-filters';

type ProbationReviewExportRow = Record<
  (typeof PROBATION_REVIEW_EXPORT_KEYS)[number],
  string
>;

type SectionRegisterProps = {
  records?: ProbationReviewRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: ProbationReviewFilters;
  institutionOptions?: FilterOption[];
  departmentOptions?: FilterOption[];
  designationOptions?: FilterOption[];
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  institutionOptions = [],
  departmentOptions = [],
  designationOptions = []
}: SectionRegisterProps) {
  // UI preview: exports the rows currently held in memory. Replace with a
  // server export (re-query by filters) when the data is dynamic.
  const handleExport = async (): Promise<{
    success: boolean;
    data?: ProbationReviewExportRow[];
    message?: string;
  }> => {
    if (records.length === 0) {
      return { success: false, message: 'No probation reviews found' };
    }

    return {
      success: true,
      data: records.map((row) => ({
        staffCode: row.staffCode,
        staffName: row.staffName,
        department: row.department,
        designation: row.designation,
        reportingManager: row.reportingManager,
        joiningDate: row.joiningDate,
        probationStartDate: row.probationStartDate,
        probationEndDate: row.probationEndDate,
        reviewDueDate: row.reviewDueDate,
        reviewStatus: PROBATION_REVIEW_STATUS_LABELS[row.reviewStatus]
      }))
    };
  };

  return (
    <div className="space-y-4">
      <SectionFilters
        initial={initialFilters}
        institutionOptions={institutionOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading probation reviews...
          </div>
        }
      >
        <CommonDataTable
          heading="Probation Review Register"
          subHeading={`${totalRecords} ${totalRecords === 1 ? 'record' : 'records'}`}
          columns={probationReviewColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={handleExport}
              columns={[...PROBATION_REVIEW_EXPORT_COLUMNS]}
              keys={[...PROBATION_REVIEW_EXPORT_KEYS]}
              title="Probation Reviews"
              fileName="probation-reviews"
            />
          }
        />
      </Suspense>
    </div>
  );
}
