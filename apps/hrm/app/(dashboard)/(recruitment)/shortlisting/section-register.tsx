'use client';

import { Suspense, useEffect } from 'react';
import { Scale } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature,
  useCommonDataTableContext
} from '@/components/common/common-data-table';
import type {
  ShortlistingFilters,
  ShortlistingRecord,
  VacancySelectOption
} from '@/types/recruitment';
import {
  SHORTLISTING_EXPORT_COLUMNS,
  SHORTLISTING_EXPORT_KEYS,
  shortlistingColumns
} from './columns';
import SectionFilters from './section-filters';
import { useShortlistingUi } from './shortlisting-ui-context';

type ShortlistingExportRow = {
  candidateName: string;
  applicationId: string;
  jobTitle: string;
  qualifications: string;
  experienceYears: string;
  skills: string;
  appliedDate: string;
  screeningScore: number;
  currentStage: string;
  shortlistStatus: string;
  createdAt: string;
  updatedAt: string;
};

type SectionRegisterProps = {
  records?: ShortlistingRecord[];
  totalRecords?: number;
  page?: string;
  initialFilters?: ShortlistingFilters;
  departmentOptions?: VacancySelectOption[];
  designationOptions?: VacancySelectOption[];
  jobPostOptions?: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: ShortlistingExportRow[];
    message?: string;
  }>;
};

function SelectionSync() {
  const { rowSelection, table } = useCommonDataTableContext();
  const { setSelectedRecords } = useShortlistingUi();

  useEffect(() => {
    const selected = Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => table.getRow(key).original as ShortlistingRecord);
    setSelectedRecords(selected);
  }, [rowSelection, setSelectedRecords, table]);

  return null;
}

function CompareToolbar() {
  const { toast } = useToast();
  const { selectedRecords, openCompare } = useShortlistingUi();
  const count = selectedRecords.length;

  return (
    <div className="flex items-center gap-2">
      <SelectionSync />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 gap-1.5"
        onClick={() => {
          if (count < 2) {
            toast({
              title: 'Compare',
              description: 'Select at least two candidates to compare.'
            });
            return;
          }
          openCompare();
        }}
      >
        <Scale className="h-3.5 w-3.5" />
        Compare ({count})
      </Button>
    </div>
  );
}

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page,
  initialFilters = {},
  departmentOptions = [],
  designationOptions = [],
  jobPostOptions = [],
  onExport
}: SectionRegisterProps) {
  return (
    <div className="space-y-4">
      <SectionFilters
        initial={initialFilters}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        jobPostOptions={jobPostOptions}
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading shortlisting...
          </div>
        }
      >
        <CommonDataTable
          heading="Shortlisting Register"
          subHeading="Review screened candidates and select them for interview."
          columns={shortlistingColumns}
          data={records}
          rowCount={totalRecords}
          page={page}
          showPagination
          haveBulkDelete
          toolbarLeft={<CompareToolbar />}
          toolbarRight={
            <DataTableExportFeature
              showColumnToggle
              showPrintButton
              serverData={onExport}
              columns={[...SHORTLISTING_EXPORT_COLUMNS]}
              keys={[...SHORTLISTING_EXPORT_KEYS]}
              title="Shortlisting"
              fileName="shortlisting"
            />
          }
        />
      </Suspense>
    </div>
  );
}
