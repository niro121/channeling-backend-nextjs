'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  ResumeBankFilters,
  ResumeBankRecord,
  ResumeBankSummary,
  VacancySelectOption
} from '@/types/recruitment';
import DialogResumeBankFile from './dialog-resume-bank-file';
import DialogResumeBankView from './dialog-resume-bank-view';
import { ResumeBankHeaderActions } from './header-actions';
import {
  ResumeBankUiProvider,
  useResumeBankUi
} from './resume-bank-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetAddToJobApplication from './sheet-add-to-job-application';
import SheetResumeBankForm from './sheet-resume-bank-form';

type ResumeBankExportRow = {
  profileId: string;
  candidateName: string;
  resumeFileName: string;
  email: string;
  phone: string;
  qualifications: string;
  experienceYears: string;
  skills: string;
  preferredPosition: string;
  preferredDepartment: string;
  location: string;
  source: string;
  dateAdded: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ResumeBankWorkspaceProps = {
  initialRecords: ResumeBankRecord[];
  totalRecords: number;
  summary: ResumeBankSummary;
  page?: string;
  initialFilters?: ResumeBankFilters;
  departmentOptions: VacancySelectOption[];
  designationOptions: VacancySelectOption[];
  publishedJobPosts: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: ResumeBankExportRow[];
    message?: string;
  }>;
};

function ResumeBankWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters,
  departmentOptions,
  designationOptions,
  publishedJobPosts,
  onExport
}: ResumeBankWorkspaceProps) {
  const {
    formSheet,
    viewRecord,
    resumeRecord,
    addToJobRecord,
    closeFormSheet,
    closeView,
    closeResume,
    closeAddToJob
  } = useResumeBankUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Resume Bank"
        description="Searchable repository of candidate CVs and profiles for recruitment."
        actions={<ResumeBankHeaderActions />}
      />

      <SectionSummary summary={summary} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
        initialFilters={initialFilters}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        onExport={onExport}
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
          asChild
        >
          <Link href="/shortlisting">
            Shortlisting
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <SheetResumeBankForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />

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
        jobPostOptions={publishedJobPosts}
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
