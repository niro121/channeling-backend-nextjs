'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  ApplicationFilters,
  ApplicationRecord,
  ApplicationSummary
} from '@/types/recruitment';
import {
  ApplicationsUiProvider,
  useApplicationsUi
} from './applications-ui-context';
import DialogApplicationResume from './dialog-application-resume';
import DialogApplicationView from './dialog-application-view';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetApplicationHistory from './sheet-application-history';
import SheetScheduleInterview from './sheet-schedule-interview';

type ApplicationsWorkspaceProps = {
  initialRecords: ApplicationRecord[];
  totalRecords: number;
  summary: ApplicationSummary;
  page?: string;
  initialFilters?: ApplicationFilters;
};

function ApplicationsWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: ApplicationsWorkspaceProps) {
  const {
    viewRecord,
    resumeRecord,
    historyRecord,
    scheduleRecord,
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
      />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        initialFilters={initialFilters}
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
