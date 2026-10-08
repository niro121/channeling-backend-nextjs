'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  JobPostFilters,
  JobPostRecord,
  JobPostSummary
} from '@/types/recruitment';
import DialogJobPostView from './dialog-job-post-view';
import { JobPostsHeaderActions } from './header-actions';
import {
  JobPostsUiProvider,
  useJobPostsUi
} from './job-posts-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetJobPostForm from './sheet-job-post-form';

type JobPostsWorkspaceProps = {
  initialRecords: JobPostRecord[];
  totalRecords: number;
  summary: JobPostSummary;
  page?: string;
  initialFilters?: JobPostFilters;
};

function JobPostsWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: JobPostsWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    viewRecord,
    closeFormSheet,
    closeViewDialog
  } = useJobPostsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Job Posts"
        description="Create, publish and track job posts linked to approved vacancy requests."
        actions={<JobPostsHeaderActions />}
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
          <Link href="/vacancy-requests">
            <ArrowLeft className="h-4 w-4" />
            Vacancy Requests
          </Link>
        </Button>
        <Button
          type="button"
          className={`${buttonStyles.save} gap-1.5`}
          onClick={() =>
            toast({
              title: 'Applications',
              description: 'Applications UI will be built next in this group.'
            })
          }
        >
          Applications
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <SheetJobPostForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />

      <DialogJobPostView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeViewDialog();
        }}
        record={viewRecord}
      />
    </div>
  );
}

export default function JobPostsWorkspace(props: JobPostsWorkspaceProps) {
  return (
    <JobPostsUiProvider>
      <JobPostsWorkspaceInner {...props} />
    </JobPostsUiProvider>
  );
}
