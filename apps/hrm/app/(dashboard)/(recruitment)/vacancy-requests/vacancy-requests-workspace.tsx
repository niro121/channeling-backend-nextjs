'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  VacancyRequestFilters,
  VacancyRequestRecord,
  VacancyRequestSummary
} from '@/types/recruitment';
import DialogVacancyRequestForm from './dialog-vacancy-request-form';
import DialogVacancyRequestView from './dialog-vacancy-request-view';
import { VacancyRequestsHeaderActions } from './header-actions';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import {
  VacancyRequestsUiProvider,
  useVacancyRequestsUi
} from './vacancy-requests-ui-context';

type VacancyRequestsWorkspaceProps = {
  initialRecords: VacancyRequestRecord[];
  totalRecords: number;
  summary: VacancyRequestSummary;
  page?: string;
  initialFilters?: VacancyRequestFilters;
};

function VacancyRequestsWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: VacancyRequestsWorkspaceProps) {
  const { toast } = useToast();
  const {
    formDialog,
    viewRecord,
    closeFormDialog,
    closeViewDialog
  } = useVacancyRequestsUi();

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Vacancy Requests"
        description="Raise, approve and track staffing vacancy requests across departments."
        actions={<VacancyRequestsHeaderActions />}
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
          onClick={() =>
            toast({
              title: 'Recruitment Dashboard',
              description: 'This page will be added with the Recruitment group.'
            })
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Recruitment Dashboard
        </Button>
        <Button
          type="button"
          className={`${buttonStyles.save} gap-1.5`}
          onClick={() =>
            toast({
              title: 'Job Posts',
              description: 'Job Posts UI will be built next in this group.'
            })
          }
        >
          Job Posts
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <DialogVacancyRequestForm
        open={formDialog != null}
        mode={formDialog?.mode ?? 'create'}
        record={formDialog?.record ?? null}
        onOpenChange={(open) => {
          if (!open) closeFormDialog();
        }}
      />

      <DialogVacancyRequestView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeViewDialog();
        }}
        record={viewRecord}
      />
    </div>
  );
}

export default function VacancyRequestsWorkspace(
  props: VacancyRequestsWorkspaceProps
) {
  return (
    <VacancyRequestsUiProvider>
      <VacancyRequestsWorkspaceInner {...props} />
    </VacancyRequestsUiProvider>
  );
}
