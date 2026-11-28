'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { ProbationReviewRecord } from '@/types/performance';
import { useProbationReviewsUi } from './probation-reviews-ui-context';

type ProbationReviewRecordActionsProps = {
  record: ProbationReviewRecord;
};

export default function ProbationReviewRecordActions({
  record
}: ProbationReviewRecordActionsProps) {
  const { has } = usePermissions();
  const { openEdit } = useProbationReviewsUi();

  if (!has('performance', 'edit')) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
        aria-label={`Edit probation review for ${record.staffName}`}
        onClick={() => openEdit(record)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
}
