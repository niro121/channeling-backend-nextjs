'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  VacancyRequestFilters,
  VacancyRequestRecord,
  VacancyRequestSummary,
  VacancySelectOption
} from '@/types/recruitment';
import DialogVacancyRequestView from './dialog-vacancy-request-view';
import { VacancyRequestsHeaderActions } from './header-actions';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetVacancyRequestForm from './sheet-vacancy-request-form';
import {
  VacancyRequestsUiProvider,
  useVacancyRequestsUi
} from './vacancy-requests-ui-context';

type VacancyExportRow = {
  requestId: string;
  department: string;
  designation: string;
  vacancies: number;
  employmentType: string;
  requestedBy: string;
  requestedDate: string;
  requiredDate: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type VacancyRequestsWorkspaceProps = {
  initialRecords: VacancyRequestRecord[];
  totalRecords: number;
  summary: VacancyRequestSummary;
  page?: string;
  initialFilters?: VacancyRequestFilters;
  departmentOptions: VacancySelectOption[];
  designationOptions: VacancySelectOption[];
  onExport: () => Promise<{
    success: boolean;
    data?: VacancyExportRow[];
    message?: string;
  }>;
};

function VacancyRequestsWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters,
  departmentOptions,
  designationOptions,
  onExport
}: VacancyRequestsWorkspaceProps) {
  const { toast } = useToast();
  const {
    formSheet,
    viewRecord,
    closeFormSheet,
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
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        onExport={onExport}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          className={buttonStyles.cancel.healthy}
          onClick={() =>
            toast({
              variant: 'default',
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
          asChild
        >
          <Link href="/job-posts">
            Job Posts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <SheetVacancyRequestForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        departmentOptions={departmentOptions}
        designationOptions={designationOptions}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
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
