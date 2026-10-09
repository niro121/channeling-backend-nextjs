'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, useToast } from '@archmage/ui';
import { CommonManagerHeader } from '@/components/common/common-manager-header';
import { buttonStyles } from '@/lib/utils/common-styles';
import {
  computeEvaluationScore,
  type EvaluationRecord
} from '@/types/recruitment';
import DialogEvaluationView from './dialog-evaluation-view';
import {
  EvaluationUiProvider,
  useEvaluationUi
} from './evaluation-ui-context';
import SectionForm from './section-form';
import SectionRegister from './section-register';

type EvaluationWorkspaceProps = {
  initialRecords: EvaluationRecord[];
  totalRecords: number;
  initialActive: EvaluationRecord;
  page?: string;
};

function EvaluationWorkspaceInner({
  initialRecords,
  totalRecords,
  page
}: EvaluationWorkspaceProps) {
  const { toast } = useToast();
  const {
    activeRecord,
    viewRecord,
    previewOpen,
    closeView,
    closePreview
  } = useEvaluationUi();

  const previewScore = computeEvaluationScore(activeRecord.ratings).score;
  const previewRecord: EvaluationRecord = {
    ...activeRecord,
    overallScore: previewScore
  };

  return (
    <div className="space-y-6">
      <CommonManagerHeader
        title="Evaluation"
        description="Panel evaluation of interviewed candidates."
      />

      <SectionForm record={activeRecord} />

      <SectionRegister
        records={initialRecords}
        totalRecords={totalRecords}
        page={page}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          className={buttonStyles.cancel.healthy}
          asChild
        >
          <Link href="/interview-schedule">
            <ArrowLeft className="h-4 w-4" />
            Interview Schedule
          </Link>
        </Button>
        <Button
          type="button"
          className={`${buttonStyles.save} gap-1.5`}
          onClick={() =>
            toast({
              title: 'Appointment Letters',
              description:
                'Appointment Letters UI will be built next in this group.'
            })
          }
        >
          Appointment Letters
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <DialogEvaluationView
        open={viewRecord != null}
        setOpen={(open) => {
          if (!open) closeView();
        }}
        record={viewRecord}
      />

      <DialogEvaluationView
        open={previewOpen}
        setOpen={(open) => {
          if (!open) closePreview();
        }}
        record={previewRecord}
        title={`Preview · ${activeRecord.candidateName}`}
      />
    </div>
  );
}

export default function EvaluationWorkspace(props: EvaluationWorkspaceProps) {
  return (
    <EvaluationUiProvider initialRecord={props.initialActive}>
      <EvaluationWorkspaceInner {...props} />
    </EvaluationUiProvider>
  );
}
