'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  ApplicationFilters,
  ApplicationRecord,
  ApplicationSummary,
  VacancySelectOption
} from '@/types/recruitment';
import {
  ApplicationsUiProvider,
  useApplicationsUi
} from './applications-ui-context';
import DialogApplicationResume from './dialog-application-resume';
import DialogApplicationView from './dialog-application-view';
import { ApplicationsHeaderActions } from './header-actions';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetApplicationForm from './sheet-application-form';
import SheetApplicationHistory from './sheet-application-history';
import SheetScheduleInterview from './sheet-schedule-interview';

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

type ApplicationsWorkspaceProps = {
  initialRecords: ApplicationRecord[];
  totalRecords: number;
  summary: ApplicationSummary;
  page?: string;
  initialFilters?: ApplicationFilters;
  departmentOptions: VacancySelectOption[];
  jobPostOptions: VacancySelectOption[];
  publishedJobPosts: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: ApplicationExportRow[];
    message?: string;
  }>;
};

function ApplicationsWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters,
  departmentOptions,
  jobPostOptions,
  publishedJobPosts,
  onExport
}: ApplicationsWorkspaceProps) {
  const {
    formSheet,
    viewRecord,
    resumeRecord,
    historyRecord,
    scheduleRecord,
    closeFormSheet,
    closeView,
    closeResume,
    closeHistory,
    closeSchedule
  } = useApplicationsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Applications"
        description="Track every candidate application through the recruitment stages."
        actions={<ApplicationsHeaderActions />}
      />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        initialFilters={initialFilters}
        departmentOptions={departmentOptions}
        jobPostOptions={jobPostOptions}
        onExport={onExport}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          className={buttonStyles.cancel.healthy}
          asChild
        >
          <Link href="/job-posts">
            <ArrowLeft className="h-4 w-4" />
            Job Posts
          </Link>
        </Button>
        <Button
          type="button"
          className={`${buttonStyles.save} gap-1.5`}
          asChild
        >
          <Link href="/resume-bank">
            Resume Bank
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <SheetApplicationForm
        open={formSheet != null}
        jobPostOptions={jobPostOptions}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />

      <DialogApplicationView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />

      <DialogApplicationResume
        open={resumeRecord != null}
        setOpen={(open) => {
          if (!open) closeResume();
        }}
        record={resumeRecord}
      />

      <SheetApplicationHistory
        open={historyRecord != null}
        record={historyRecord}
        onOpenChange={(open) => {
          if (!open) closeHistory();
        }}
      />

      <SheetScheduleInterview
        open={scheduleRecord != null}
        record={scheduleRecord}
        jobPostOptions={jobPostOptions.length ? jobPostOptions : publishedJobPosts}
        onOpenChange={(open) => {
          if (!open) closeSchedule();
        }}
      />
    </div>
  );
}

export default function ApplicationsWorkspace(
  props: ApplicationsWorkspaceProps
) {
  return (
    <ApplicationsUiProvider>
      <ApplicationsWorkspaceInner {...props} />
    </ApplicationsUiProvider>
  );
}
