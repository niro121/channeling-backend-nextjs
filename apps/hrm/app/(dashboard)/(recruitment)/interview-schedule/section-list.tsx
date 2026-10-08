'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  type InterviewRecord
} from '@/types/recruitment';
import {
  INTERVIEW_EXPORT_COLUMNS,
  INTERVIEW_EXPORT_KEYS,
  interviewColumns
} from './columns';

type SectionListProps = {
  records: InterviewRecord[];
  totalRecords: number;
  page?: string;
};

export default function SectionList({
  records,
  totalRecords,
  page
}: SectionListProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    if (!records.length) {
      toast({
        title: 'Export',
        description: 'No interviews to export.'
      });
      return {
        success: false,
        message: 'No interviews found'
      };
    }

    const data = records.map((row) => ({
      candidateName: row.candidateName,
      jobTitle: row.jobTitle,
      interviewDate: row.interviewDate,
      startTime: row.startTime,
      endTime: row.endTime,
      interviewerPanel: row.interviewerPanel,
      interviewType:
        INTERVIEW_TYPE_LABELS[row.interviewType] ?? row.interviewType,
      location: row.location,
      status: INTERVIEW_STATUS_LABELS[row.status] ?? row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return { success: true, data };
  };

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading interviews...
        </div>
      }
    >
      <CommonDataTable
        heading="Interview Register"
        subHeading="Plan, confirm and run candidate interviews."
        columns={interviewColumns}
        data={records}
        rowCount={totalRecords}
        page={page}
        showPagination
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[...INTERVIEW_EXPORT_COLUMNS]}
            keys={[...INTERVIEW_EXPORT_KEYS]}
            title="Interview Schedule"
            fileName="interview-schedule"
          />
        }
      />
    </Suspense>
  );
}
