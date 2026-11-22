'use client';

import Link from 'next/link';
import { Eye, Mail, Pencil } from 'lucide-react';
import { Button } from '@archmage/ui';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { EvaluationRecord } from '@/types/recruitment';
import { useEvaluationUi } from './evaluation-ui-context';

type EvaluationRecordActionsProps = {
  record: EvaluationRecord;
};

export default function EvaluationRecordActions({
  record
}: EvaluationRecordActionsProps) {
  const { has } = usePermissions();
  const { openView, editRecord } = useEvaluationUi();

  const canView = has('recruitment', 'view');
  const canEdit = has('recruitment', 'edit');

  if (!canView && !canEdit) return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {canView ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`View evaluation for ${record.candidateName}`}
          onClick={() => openView(record)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ) : null}

      {canEdit && record.status === 'submitted' ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Appointment letter for ${record.candidateName}`}
          asChild
        >
          <Link
            href={`/appointment-letters?evaluationId=${encodeURIComponent(record.id)}&candidate=${encodeURIComponent(record.candidateName)}`}
          >
            <Mail className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}

      {canEdit && record.status === 'draft' ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
          aria-label={`Edit evaluation for ${record.candidateName}`}
          onClick={() => editRecord(record)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
