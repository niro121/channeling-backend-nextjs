'use client';

import { ShieldCheck } from 'lucide-react';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import type {
  PerformanceSelectOption,
  PromotionFilters,
  PromotionRecord,
  PromotionSummary
} from '@/types/performance';
import { PromotionsHeaderActions } from './header-actions';
import { PromotionsUiProvider, usePromotionsUi } from './promotions-ui-context';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetPromotionForm from './sheet-promotion-form';

type PromotionsWorkspaceProps = {
  summary: PromotionSummary;
  records: PromotionRecord[];
  totalRecords: number;
  page?: string;
  initialFilters?: PromotionFilters;
  institutionOptions: PerformanceSelectOption[];
  departmentOptions: PerformanceSelectOption[];
  currentDesignationOptions: PerformanceSelectOption[];
  proposedDesignationOptions: PerformanceSelectOption[];
  designationOptions: PerformanceSelectOption[];
  gradeOptions: PerformanceSelectOption[];
  staffOptions: PerformanceSelectOption[];
};

function PromotionsWorkspaceInner({
  summary,
  records,
  totalRecords,
  page,
  initialFilters,
  institutionOptions,
  departmentOptions,
  currentDesignationOptions,
  proposedDesignationOptions,
  designationOptions,
  gradeOptions,
  staffOptions
}: PromotionsWorkspaceProps) {
  const { formSheet, closeForm } = usePromotionsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Promotions"
        description="Promotion requests, approvals and employment history"
        actions={<PromotionsHeaderActions />}
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
        currentDesignationOptions={currentDesignationOptions}
        proposedDesignationOptions={proposedDesignationOptions}
      />

      <SheetPromotionForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        staffOptions={staffOptions}
        designationOptions={designationOptions}
        gradeOptions={gradeOptions}
        departmentOptions={departmentOptions}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
      />
    </div>
  );
}

export default function PromotionsWorkspace(props: PromotionsWorkspaceProps) {
  return (
    <PromotionsUiProvider>
      <PromotionsWorkspaceInner {...props} />
    </PromotionsUiProvider>
  );
}
