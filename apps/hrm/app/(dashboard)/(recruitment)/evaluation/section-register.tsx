'use client';

import { Suspense } from 'react';
import { useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  EVALUATION_DECISION_LABELS,
  EVALUATION_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  type EvaluationRecord
} from '@/types/recruitment';
import {
  EVALUATION_EXPORT_COLUMNS,
  EVALUATION_EXPORT_KEYS,
  evaluationColumns
} from './columns';

type SectionRegisterProps = {
  records?: EvaluationRecord[];
  totalRecords?: number;
  page?: string;
};

export default function SectionRegister({
  records = [],
  totalRecords = 0,
  page
}: SectionRegisterProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    if (!records.length) {
      toast({
        title: 'Export',
        description: 'No evaluations to export.'
      });
      return {
        success: false,
        message: 'No evaluations found'
      };
    }

    const data = records.map((row) => ({
      candidateName: row.candidateName,
      jobTitle: row.jobTitle,
      interviewDate: row.interviewDate,
      interviewer: row.interviewer,
      interviewType:
        INTERVIEW_TYPE_LABELS[row.interviewType] ?? row.interviewType,
      overallScore: row.overallScore,
      finalDecision: row.finalDecision
        ? EVALUATION_DECISION_LABELS[row.finalDecision]
        : '—',
      status: EVALUATION_STATUS_LABELS[row.status],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));

    return { success: true, data };
  };

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading evaluations...
        </div>
      }
    >
      <CommonDataTable
        heading="Evaluation Register"
        subHeading="Panel evaluation outcomes for interviewed candidates."
        columns={evaluationColumns}
        data={records}
        rowCount={totalRecords}
        page={page}
        showPagination
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={handleExport}
            columns={[...EVALUATION_EXPORT_COLUMNS]}
            keys={[...EVALUATION_EXPORT_KEYS]}
            title="Evaluation"
            fileName="evaluation"
          />
        }
      />
    </Suspense>
  );
}
