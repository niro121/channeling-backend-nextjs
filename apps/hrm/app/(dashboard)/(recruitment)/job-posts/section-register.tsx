'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  JOB_POST_STATUS_LABELS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type JobPostFilters,
  type JobPostRecord
} from '@/types/recruitment';
import {
  JOB_POST_EXPORT_COLUMNS,
  JOB_POST_EXPORT_KEYS,
  jobPostColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: JobPostRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: JobPostFilters;
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
        description: 'No job posts to export.'
      });
      return {
        success: false,
        message: 'No job posts found'
      };
    }

    const data = records.map((row) => ({
      jobPostId: row.jobPostId,
      jobTitle: row.jobTitle,
      department: row.department,
      designation: row.designation,
      employmentType:
        VACANCY_EMPLOYMENT_TYPE_LABELS[row.employmentType] ??
        row.employmentType,
      openings: row.openings,
      postedDate: row.postedDate ?? '',
      closingDate: row.closingDate,
      applicationsCount: row.applicationsCount,
      status: JOB_POST_STATUS_LABELS[row.status] ?? row.status,
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
              serverData={handleExport}
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
