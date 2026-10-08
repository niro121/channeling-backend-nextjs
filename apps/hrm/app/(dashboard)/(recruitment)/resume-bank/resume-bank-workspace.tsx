'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  ResumeBankFilters,
  ResumeBankRecord,
  ResumeBankSummary
} from '@/types/recruitment';
import DialogResumeBankFile from './dialog-resume-bank-file';
import DialogResumeBankView from './dialog-resume-bank-view';
import {
  ResumeBankUiProvider,
  useResumeBankUi
} from './resume-bank-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetAddToJobApplication from './sheet-add-to-job-application';

type ResumeBankWorkspaceProps = {
  initialRecords: ResumeBankRecord[];
  totalRecords: number;
  summary: ResumeBankSummary;
  page?: string;
  initialFilters?: ResumeBankFilters;
};

function ResumeBankWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: ResumeBankWorkspaceProps) {
  const { toast } = useToast();
  const {
    viewRecord,
    resumeRecord,
    addToJobRecord,
    closeView,
    closeResume,
    closeAddToJob
  } = useResumeBankUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Resume Bank"
        description="Searchable repository of candidate CVs and profiles for recruitment."
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
          <Link href="/applications">
            <ArrowLeft className="h-4 w-4" />
            Applications
          </Link>
        </Button>
        <Button
          type="button"
          className={`${buttonStyles.save} gap-1.5`}
          onClick={() =>
            toast({
              title: 'Shortlisting',
              description: 'Shortlisting UI will be built next in this group.'
            })
          }
        >
          Shortlisting
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <DialogResumeBankView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />

      <DialogResumeBankFile
        open={resumeRecord != null}
        setOpen={(open) => {
          if (!open) closeResume();
        }}
        record={resumeRecord}
      />

      <SheetAddToJobApplication
        open={addToJobRecord != null}
        record={addToJobRecord}
        onOpenChange={(open) => {
          if (!open) closeAddToJob();
        }}
      />
    </div>
  );
}

export default function ResumeBankWorkspace(props: ResumeBankWorkspaceProps) {
  return (
    <ResumeBankUiProvider>
      <ResumeBankWorkspaceInner {...props} />
    </ResumeBankUiProvider>
  );
}
