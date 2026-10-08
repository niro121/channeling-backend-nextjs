'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_STAGE_LABELS,
  APPLICATION_STATUS_LABELS,
  type ApplicationFilters,
  type ApplicationRecord
} from '@/types/recruitment';
import {
  APPLICATION_EXPORT_COLUMNS,
  APPLICATION_EXPORT_KEYS,
  applicationColumns
} from './columns';
import SectionFilters from './section-filters';

type SectionRegisterProps = {
  records?: ApplicationRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: ApplicationFilters;
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
        description: 'No applications to export.'
      });
      return {
        success: false,
        message: 'No applications found'
      };
    }

    const data = records.map((row) => ({
      applicationId: row.applicationId,
      candidateName: row.candidateName,
      jobTitle: row.jobTitle,
      department: row.department,
      appliedDate: row.appliedDate,
      experienceYears: `${row.experienceYears} yrs`,
      source: APPLICATION_SOURCE_LABELS[row.source] ?? row.source,
      currentStage:
        APPLICATION_STAGE_LABELS[row.currentStage] ?? row.currentStage,
      status: APPLICATION_STATUS_LABELS[row.status] ?? row.status,
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
              serverData={handleExport}
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
