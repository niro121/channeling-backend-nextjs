'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  ShortlistingFilters,
  ShortlistingRecord,
  ShortlistingSummary
} from '@/types/recruitment';
import DialogApplicationResume from '../applications/dialog-application-resume';
import DialogApplicationView from '../applications/dialog-application-view';
import SheetApplicationHistory from '../applications/sheet-application-history';
import SheetScheduleInterview from '../applications/sheet-schedule-interview';
import DialogCompareCandidates from './dialog-compare-candidates';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import {
  ShortlistingUiProvider,
  useShortlistingUi
} from './shortlisting-ui-context';

type ShortlistingWorkspaceProps = {
  initialRecords: ShortlistingRecord[];
  totalRecords: number;
  summary: ShortlistingSummary;
  page?: string;
  initialFilters?: ShortlistingFilters;
};

function ShortlistingWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: ShortlistingWorkspaceProps) {
  const { toast } = useToast();
  const {
    viewRecord,
    resumeRecord,
    historyRecord,
    scheduleRecord,
    compareOpen,
    selectedRecords,
    closeView,
    closeResume,
    closeHistory,
    closeSchedule,
    closeCompare
  } = useShortlistingUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Shortlisting"
        description="Review screened candidates and select them for interview."
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
          <Link href="/resume-bank">
            <ArrowLeft className="h-4 w-4" />
            Resume Bank
          </Link>
        </Button>
        <Button
          type="button"
          className={`${buttonStyles.save} gap-1.5`}
          onClick={() =>
            toast({
              title: 'Interview Schedule',
              description:
                'Interview Schedule UI will be built next in this group.'
            })
          }
        >
          Interview Schedule
          <ArrowRight className="h-4 w-4" />
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

      <DialogCompareCandidates
        open={compareOpen}
        setOpen={(open) => {
          if (!open) closeCompare();
        }}
        records={selectedRecords}
      />
    </div>
  );
}

export default function ShortlistingWorkspace(
  props: ShortlistingWorkspaceProps
) {
  return (
    <ShortlistingUiProvider>
      <ShortlistingWorkspaceInner {...props} />
    </ShortlistingUiProvider>
  );
}
