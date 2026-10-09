'use client';

import Link from 'next/link';
import { parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  InterviewFilters,
  InterviewRecord,
  InterviewSummary
} from '@/types/recruitment';
import DialogInterviewView from './dialog-interview-view';
import InterviewScheduleHeaderActions from './header-actions';
import {
  InterviewScheduleUiProvider,
  useInterviewScheduleUi
} from './interview-schedule-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetInterviewForm from './sheet-interview-form';
import { SAMPLE_WEEK_START } from './sample-data';

type InterviewScheduleWorkspaceProps = {
  initialRecords: InterviewRecord[];
  totalRecords: number;
  summary: InterviewSummary;
  page?: string;
  initialFilters?: InterviewFilters;
  weekStartIso?: string;
};

function InterviewScheduleWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: InterviewScheduleWorkspaceProps) {
  const { formSheet, viewRecord, closeFormSheet, closeView } =
    useInterviewScheduleUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Interview Schedule"
        description="Plan, confirm and run candidate interviews."
        actions={<InterviewScheduleHeaderActions />}
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
          <Link href="/shortlisting">
            <ArrowLeft className="h-4 w-4" />
            Shortlisting
          </Link>
        </Button>
        <Button
          type="button"
          className={`${buttonStyles.save} gap-1.5`}
          asChild
        >
          <Link href="/evaluation">
            Evaluation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <SheetInterviewForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />

      <DialogInterviewView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />
    </div>
  );
}

export default function InterviewScheduleWorkspace(
  props: InterviewScheduleWorkspaceProps
) {
  const weekStart = parseISO(props.weekStartIso ?? SAMPLE_WEEK_START);

  return (
    <InterviewScheduleUiProvider initialWeekStart={weekStart}>
      <InterviewScheduleWorkspaceInner {...props} />
    </InterviewScheduleUiProvider>
  );
}
