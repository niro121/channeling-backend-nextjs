'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import type {
  AppointmentLetterFilters,
  AppointmentLetterRecord,
  AppointmentLetterSummary
} from '@/types/recruitment';
import {
  AppointmentLettersUiProvider,
  useAppointmentLettersUi,
  withGeneratedFlag
} from './appointment-letters-ui-context';
import DialogAppointmentLetterView from './dialog-appointment-letter-view';
import DialogLetterPreview from './dialog-letter-preview';
import AppointmentLettersHeaderActions from './header-actions';
import SectionRegister from './section-register';
import SectionSummary from './section-summary';
import SheetAppointmentLetterForm from './sheet-appointment-letter-form';

type AppointmentLettersWorkspaceProps = {
  initialRecords: AppointmentLetterRecord[];
  totalRecords: number;
  summary: AppointmentLetterSummary;
  page?: string;
  initialFilters?: AppointmentLetterFilters;
};

function AppointmentLettersWorkspaceInner({
  initialRecords,
  totalRecords,
  summary,
  page,
  initialFilters
}: AppointmentLettersWorkspaceProps) {
  const {
    formSheet,
    viewRecord,
    letterPreviewRecord,
    generatedIds,
    closeFormSheet,
    closeView,
    closeLetterPreview
  } = useAppointmentLettersUi();

  const previewRecord = letterPreviewRecord
    ? withGeneratedFlag(letterPreviewRecord, generatedIds)
    : null;

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Appointment Letters"
        description="Generate, approve and issue appointment letters to selected candidates."
        actions={<AppointmentLettersHeaderActions />}
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
          <Link href="/evaluation">
            <ArrowLeft className="h-4 w-4" />
            Evaluation
          </Link>
        </Button>
      </div>

      <SheetAppointmentLetterForm
        open={formSheet != null}
        mode={formSheet?.mode ?? 'create'}
        record={formSheet?.record ?? null}
        onOpenChange={(open) => {
          if (!open) closeFormSheet();
        }}
      />

      <DialogAppointmentLetterView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />

      <DialogLetterPreview
        open={previewRecord != null}
        setOpen={(open) => {
          if (!open) closeLetterPreview();
        }}
        record={previewRecord}
      />
    </div>
  );
}

export default function AppointmentLettersWorkspace(
  props: AppointmentLettersWorkspaceProps
) {
  return (
    <AppointmentLettersUiProvider>
      <AppointmentLettersWorkspaceInner {...props} />
    </AppointmentLettersUiProvider>
  );
}
