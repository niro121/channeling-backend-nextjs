'use client';

import { ShieldCheck } from 'lucide-react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  ProbationReviewFilters,
  ProbationReviewRecord,
  ProbationReviewSummary
} from '@/types/performance';
import { ProbationReviewsHeaderActions } from './header-actions';
import {
  ProbationReviewsUiProvider,
  useProbationReviewsUi
} from './probation-reviews-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import type { FilterOption } from './section-filters';
import SheetProbationReviewForm from './sheet-probation-review-form';

type ProbationReviewsWorkspaceProps = {
  summary: ProbationReviewSummary;
  records: ProbationReviewRecord[];
  totalRecords: number;
  page?: string;
  initialFilters?: ProbationReviewFilters;
  institutionOptions: FilterOption[];
  departmentOptions: FilterOption[];
  designationOptions: FilterOption[];
  staffOptions: FilterOption[];
};

function ProbationReviewsWorkspaceInner({
  summary,
  records,
  totalRecords,
  page,
  initialFilters,
  institutionOptions,
  departmentOptions,
  designationOptions,
  staffOptions
}: ProbationReviewsWorkspaceProps) {
  const { formSheet, closeForm } = useProbationReviewsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Probation Reviews"
        description="Probation assessments and review recommendations"
        actions={<ProbationReviewsHeaderActions />}
      />

      <div
        role="status"
        className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Sample HR records - approval access is not connected. Changes apply to
          this preview session only; staff, payroll and email delivery are
          unchanged.
        </p>
      </div>

      <SectionSummary summary={summary} />

      <SectionRegister
        records={records}
        totalRecords={totalRecords}
        page={page}
        initialFilters={initialFilters}
        institutionOptions={institutionOptions}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
      />

      <SheetProbationReviewForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        staffOptions={staffOptions}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
      />
    </div>
  );
}

export default function ProbationReviewsWorkspace(
  props: ProbationReviewsWorkspaceProps
) {
  return (
    <ProbationReviewsUiProvider>
      <ProbationReviewsWorkspaceInner {...props} />
    </ProbationReviewsUiProvider>
  );
}
